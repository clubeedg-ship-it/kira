#!/usr/bin/env node
/**
 * Voice Layer - Main orchestrator
 * 
 * Transforms Kira's text messages into voice summaries,
 * and Otto's voice responses into crafted text messages.
 * 
 * Usage:
 *   node voice-layer.js [command]
 * 
 * Commands:
 *   start     Start voice layer daemon
 *   read      Read latest Kira messages
 *   respond   Record and craft response
 *   query     RAG query (voice or text)
 *   search    Web search
 *   send      Send queued messages
 */

import { speak, summarizeAndSpeak } from './tts.js';
import { listen, transcribe } from './stt.js';
import { queryMemory, formatRAGResults, initRAG, closeRAG } from './rag.js';
import { processVoiceCommand, summarizeForSpeech, craftResponse, startSession } from './voice-agent.js';
import { getLatestMessages, sendAsOtto, formatForVoice } from './telegram-bridge.js';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const CONFIG_PATH = path.join(process.env.HOME, '.config/clawdbot/voice-layer.json');

// Load config
function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return {
      whisper: { mode: 'api' },
      elevenlabs: {},
      rag: { enabled: true },
      web_search: { enabled: true }
    };
  }
}

const config = loadConfig();

/**
 * Read and speak latest Kira messages
 */
async function readMessages(count = 3) {
  console.log('📨 Fetching latest messages from Kira...\n');
  
  const messages = getLatestMessages(count, true);
  
  if (messages.length === 0) {
    await speak('No recent messages from Kira.');
    return;
  }
  
  console.log(`Found ${messages.length} messages:\n`);
  
  for (const msg of messages) {
    console.log(`---\n${msg.content.slice(0, 200)}...\n`);
    
    // Summarize for speech
    const summary = await summarizeForSpeech(msg.content);
    console.log(`Speaking: ${summary}\n`);
    
    await speak(summary);
    
    // Pause between messages
    await new Promise(r => setTimeout(r, 1000));
  }
}

/**
 * Record voice and craft response
 */
async function recordAndRespond(originalMessage = null) {
  console.log('🎤 Listening... (speak your response)\n');
  
  await speak('Listening.');
  
  try {
    // Get original message if not provided
    if (!originalMessage) {
      const messages = getLatestMessages(1, true);
      originalMessage = messages[0]?.content || '';
    }
    
    // Record and transcribe
    const voiceInput = await listen({ duration: 15, mode: config.whisper?.mode });
    console.log(`Transcribed: "${voiceInput}"\n`);
    
    // Process with context
    const result = await processVoiceCommand(voiceInput, {
      originalMessage,
      topic: originalMessage.slice(0, 100)
    });
    
    console.log(`Result type: ${result.type}`);
    
    if (result.type === 'crafted_message') {
      console.log(`\n📝 Crafted message:\n"${result.crafted}"\n`);
      
      // Confirm before sending
      await speak(`Message crafted: ${result.crafted.slice(0, 100)}. Say send it to confirm.`);
      
      // Listen for confirmation
      const confirmation = await listen({ duration: 5 });
      
      if (confirmation.toLowerCase().includes('send')) {
        await sendAsOtto(result.crafted);
        await speak('Message sent.');
        console.log('✅ Message sent!\n');
      } else {
        await speak('Message cancelled.');
        console.log('❌ Cancelled\n');
      }
    } else {
      // RAG or web search result
      console.log(`\nResult: ${result.response}\n`);
      await speak(result.response.slice(0, 300));
    }
    
    return result;
  } catch (e) {
    console.error('Error:', e.message);
    await speak('Sorry, something went wrong.');
    return null;
  }
}

/**
 * Interactive mode
 */
async function interactive() {
  console.log('🎙️  Voice Layer Interactive Mode\n');
  console.log('Commands:');
  console.log('  read     - Read latest Kira messages');
  console.log('  respond  - Record and craft response');
  console.log('  query    - RAG query');
  console.log('  search   - Web search');
  console.log('  text     - Type message instead of voice');
  console.log('  quit     - Exit\n');
  
  initRAG();
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const prompt = () => {
    rl.question('voice> ', async (input) => {
      const cmd = input.trim().toLowerCase();
      
      if (cmd === 'quit' || cmd === 'exit') {
        closeRAG();
        rl.close();
        return;
      }
      
      if (cmd === 'read') {
        await readMessages();
      } else if (cmd === 'respond') {
        await recordAndRespond();
      } else if (cmd.startsWith('query ')) {
        const topic = input.slice(6);
        const results = queryMemory(topic);
        console.log(formatRAGResults(results) || 'No results found.');
      } else if (cmd.startsWith('search ')) {
        const { webSearch } = await import('./voice-agent.js');
        const query = input.slice(7);
        const results = await webSearch(query);
        console.log(results.found ? results.text : 'No results found.');
      } else if (cmd.startsWith('text ')) {
        const text = input.slice(5);
        const result = await processVoiceCommand(text, {});
        console.log(`Crafted: ${result.crafted || result.response}`);
      } else if (cmd) {
        console.log('Unknown command. Try: read, respond, query, search, text, quit');
      }
      
      prompt();
    });
  };
  
  prompt();
}

/**
 * Process pending voice messages (for daemon mode)
 */
async function processPending() {
  const pendingDir = path.join(process.env.HOME, '.clawdbot/voice/pending');
  
  try {
    const files = fs.readdirSync(pendingDir).filter(f => f.endsWith('.json'));
    
    for (const file of files) {
      const filePath = path.join(pendingDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      console.log(`Processing: ${data.message?.slice(0, 50)}...`);
      
      // Send via appropriate method
      // For now, just log - actual sending handled by Clawdbot
      
      // Move to processed
      const processedDir = path.join(pendingDir, 'processed');
      fs.mkdirSync(processedDir, { recursive: true });
      fs.renameSync(filePath, path.join(processedDir, file));
    }
  } catch (e) {
    // No pending or dir doesn't exist
  }
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'interactive';
  
  switch (command) {
    case 'read':
      await readMessages(parseInt(args[1]) || 3);
      break;
      
    case 'respond':
      await recordAndRespond();
      break;
      
    case 'query':
      initRAG();
      const topic = args.slice(1).join(' ');
      const results = queryMemory(topic);
      console.log(formatRAGResults(results) || 'No results found.');
      closeRAG();
      break;
      
    case 'send':
      await processPending();
      break;
      
    case 'start':
    case 'interactive':
    default:
      await interactive();
      break;
  }
}

main().catch(console.error);
