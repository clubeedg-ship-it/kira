#!/usr/bin/env node
/**
 * Voice Layer Server - HTTP endpoint for iPhone
 * 
 * Receives transcriptions from iOS Shortcut,
 * processes with RAG + LLM, sends to Telegram.
 * 
 * Usage:
 *   node server.js [--port 3456]
 * 
 * Endpoints:
 *   POST /voice/process   - Process voice transcription
 *   POST /voice/read      - Get latest Kira messages (TTS)
 *   GET  /voice/status    - Health check
 */

import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { processVoiceCommand, summarizeForSpeech } from './voice-agent.js';
import { queryMemory, formatRAGResults, initRAG } from './rag.js';
import { getLatestMessages } from './telegram-bridge.js';

const PORT = process.env.VOICE_PORT || 3456;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 
  (() => {
    try {
      // Try to read from Clawdbot config
      const config = JSON.parse(fs.readFileSync(
        path.join(process.env.HOME, '.config/clawdbot/config.json'), 'utf8'
      ));
      return config.telegram?.botToken;
    } catch { return null; }
  })();

const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '7985502241';
const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY ||
  (() => {
    try {
      return fs.readFileSync(path.join(process.env.HOME, '.config/elevenlabs/api_key'), 'utf8').trim();
    } catch { return null; }
  })();

// Initialize RAG
initRAG();

const VOICE_PREFIX = process.env.VOICE_PREFIX || '🎙️ Voice';

/**
 * Send message to Telegram with voice tag
 */
async function sendTelegram(message, chatId = TELEGRAM_CHAT_ID, options = {}) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('No Telegram bot token configured');
    return { success: false, error: 'No bot token' };
  }
  
  // Add voice tag unless disabled
  const taggedMessage = options.noTag ? message : `[${VOICE_PREFIX}] ${message}`;
  
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      chat_id: chatId,
      text: taggedMessage
    });
    
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ success: json.ok, messageId: json.result?.message_id });
        } catch {
          resolve({ success: false, error: 'Invalid response' });
        }
      });
    });
    
    req.on('error', (e) => resolve({ success: false, error: e.message }));
    req.write(payload);
    req.end();
  });
}

/**
 * Generate TTS URL (ElevenLabs streaming)
 */
function getTTSUrl(text, voiceId = 'EXAVITQu4vr4xnSDxMaL') {
  if (!ELEVENLABS_KEY) return null;
  
  // Return URL that iOS can play directly
  const encoded = encodeURIComponent(text);
  return `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?text=${encoded}&model_id=eleven_multilingual_v2&xi-api-key=${ELEVENLABS_KEY}`;
}

/**
 * Handle voice processing request
 */
async function handleProcess(body) {
  const { text, context, sendToTelegram = true } = body;
  
  if (!text) {
    return { error: 'No text provided' };
  }
  
  console.log(`Processing: "${text.slice(0, 100)}..."`);
  
  // Get latest Kira message for context
  const kiraMessages = getLatestMessages(1, true);
  const originalMessage = kiraMessages[0]?.content || '';
  
  // Process with voice agent
  const result = await processVoiceCommand(text, {
    originalMessage,
    topic: context || originalMessage.slice(0, 100)
  });
  
  const response = {
    type: result.type,
    original: text,
    crafted: result.crafted || result.response
  };
  
  // Send to Telegram if requested and it's a crafted message
  if (sendToTelegram && result.type === 'crafted_message' && result.crafted) {
    const telegramResult = await sendTelegram(result.crafted);
    response.telegram = telegramResult;
    console.log(`Sent to Telegram: ${telegramResult.success}`);
  }
  
  // Add TTS URL for response
  const spokenResponse = result.type === 'crafted_message'
    ? `Message sent: ${result.crafted.slice(0, 100)}`
    : result.response?.slice(0, 200);
  
  response.ttsUrl = getTTSUrl(spokenResponse);
  response.spokenResponse = spokenResponse;
  
  return response;
}

/**
 * Handle read messages request
 */
async function handleRead(body) {
  const { count = 3 } = body;
  
  const messages = getLatestMessages(count, true);
  
  if (messages.length === 0) {
    return {
      messages: [],
      summary: 'No recent messages from Kira',
      ttsUrl: getTTSUrl('No recent messages from Kira')
    };
  }
  
  // Summarize for speech
  const summaries = [];
  for (const msg of messages) {
    const summary = await summarizeForSpeech(msg.content, { maxLength: 150 });
    summaries.push(summary);
  }
  
  const combined = summaries.join('. Next message: ');
  
  return {
    messages: messages.map(m => ({
      content: m.content.slice(0, 500),
      timestamp: m.timestamp
    })),
    summary: combined,
    ttsUrl: getTTSUrl(combined)
  };
}

/**
 * Handle RAG query
 */
async function handleQuery(body) {
  const { topic } = body;
  
  if (!topic) {
    return { error: 'No topic provided' };
  }
  
  const results = queryMemory(topic);
  const formatted = formatRAGResults(results);
  
  return {
    topic,
    results,
    formatted,
    ttsUrl: getTTSUrl(formatted?.slice(0, 300) || 'No information found')
  };
}

/**
 * Parse request body
 */
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
  });
}

/**
 * HTTP Server
 */
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  
  console.log(`${req.method} ${path}`);
  
  let response;
  
  try {
    if (path === '/voice/process' && req.method === 'POST') {
      const body = await parseBody(req);
      response = await handleProcess(body);
    } else if (path === '/voice/read' && req.method === 'POST') {
      const body = await parseBody(req);
      response = await handleRead(body);
    } else if (path === '/voice/query' && req.method === 'POST') {
      const body = await parseBody(req);
      response = await handleQuery(body);
    } else if (path === '/voice/status') {
      response = { 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        telegram: !!TELEGRAM_BOT_TOKEN,
        tts: !!ELEVENLABS_KEY
      };
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  } catch (e) {
    console.error('Error:', e);
    res.writeHead(500);
    res.end(JSON.stringify({ error: e.message }));
  }
});

server.listen(PORT, () => {
  console.log(`
🎙️  Voice Layer Server running on port ${PORT}

Endpoints:
  POST /voice/process  - Process voice transcription
  POST /voice/read     - Get latest Kira messages  
  POST /voice/query    - RAG query
  GET  /voice/status   - Health check

Telegram: ${TELEGRAM_BOT_TOKEN ? '✅ Configured' : '❌ Not configured'}
TTS:      ${ELEVENLABS_KEY ? '✅ Configured' : '❌ Not configured'}
  `);
});
