#!/usr/bin/env node
/**
 * Bidirectional chat sync daemon v2:
 * - JSONL → WebUI dashboard (via SSE sync endpoint)
 * - WebUI messages → Telegram mirror
 * - Kira replies to WebUI → Telegram mirror
 * 
 * Goal: One conversation, two surfaces. Every message appears in both.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const BOT_TOKEN = '8435980250:AAEwxCcK1XD1wpD0NgPqY6t2KGnuBHYFqpQ';
const CHAT_ID = '7985502241';
const SESSIONS_DIR = '/home/adminuser/.openclaw/agents/main/sessions';
const DASHBOARD_PORT = 3847;
const SCRATCHPAD_FILE = '/home/adminuser/kira/dashboard/scratchpad.json';

let lastLineCount = 0;
let currentSessionFile = null;
let seenMessageIds = new Set();

// Track which messages came from WebUI to know when to mirror replies
let lastUserSource = 'telegram'; // 'telegram' | 'webui'
let lastKiraReplyMirrored = null;

// Load existing message IDs
try {
  const msgs = JSON.parse(fs.readFileSync(SCRATCHPAD_FILE, 'utf8'));
  msgs.forEach(m => { if (m.messageId) seenMessageIds.add(String(m.messageId)); });
  console.log(`Loaded ${seenMessageIds.size} existing message IDs`);
} catch {}

function getLatestSession() {
  const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.jsonl'));
  if (!files.length) return null;
  files.sort((a, b) => {
    const sa = fs.statSync(path.join(SESSIONS_DIR, a));
    const sb = fs.statSync(path.join(SESSIONS_DIR, b));
    return sb.mtimeMs - sa.mtimeMs;
  });
  return path.join(SESSIONS_DIR, files[0]);
}

function syncToDashboard(msg) {
  const data = JSON.stringify(msg);
  const req = http.request({
    hostname: 'localhost', port: DASHBOARD_PORT, path: '/api/chat/sync',
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), 'X-Service-Key': process.env.KIRA_SERVICE_KEY || '' }
  }, res => {
    let body = '';
    res.on('data', c => body += c);
    res.on('end', () => {});
  });
  req.on('error', () => {});
  req.write(data);
  req.end();
}

// Send to Telegram with markdown, fallback to plain text
function sendToTelegram(text, parseMode = 'Markdown') {
  return new Promise((resolve, reject) => {
    // Truncate for Telegram's 4096 char limit
    const truncated = text.length > 4000 ? text.slice(0, 3997) + '...' : text;
    const data = JSON.stringify({
      chat_id: CHAT_ID,
      text: truncated,
      parse_mode: parseMode,
      disable_web_page_preview: true
    });
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (!result.ok && parseMode === 'Markdown') {
            // Markdown failed, retry without parse_mode
            console.log('[tg] Markdown failed, retrying plain text');
            sendToTelegram(text, undefined).then(resolve).catch(reject);
          } else {
            resolve(result);
          }
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function parseSessionLine(line) {
  try {
    const entry = JSON.parse(line);
    if (entry.type !== 'message') return null;
    const msg = entry.message;
    if (!msg) return null;

    // User message
    if (msg.role === 'user') {
      let text = '';
      if (typeof msg.content === 'string') {
        text = msg.content;
      } else if (Array.isArray(msg.content)) {
        text = msg.content.filter(c => c.type === 'text').map(c => c.text).join('\n');
      }
      if (!text) return null;

      // Detect source
      const isWebUI = text.includes('[WebUI]');
      const isTelegram = text.match(/\[Telegram.*?\]/);
      
      if (isWebUI) {
        lastUserSource = 'webui';
        // Extract clean text
        let cleanText = text.replace(/\[WebUI\]\s*/g, '').trim();
        // Skip system messages
        if (cleanText.startsWith('Read HEARTBEAT.md') || cleanText.startsWith('System:')) return null;
        if (!cleanText || cleanText === 'HEARTBEAT_OK') return null;

        const messageId = entry.id || ('webui-' + Date.now());

        return {
          from: 'otto',
          content: cleanText,
          type: 'text',
          messageId: String(messageId),
          ts: entry.timestamp || new Date().toISOString(),
          source: 'webui'
        };
      }
      
      if (isTelegram) {
        lastUserSource = 'telegram';
        let cleanText = text.replace(/\[Telegram.*?\]\s*/, '').trim();
        const idMatch = text.match(/\[message_id:\s*(\d+)\]/);
        const messageId = idMatch ? idMatch[1] : entry.id;
        cleanText = cleanText.replace(/\s*\[message_id:\s*\d+\]\s*/g, '').trim();
        cleanText = cleanText.replace(/\[media attached:.*?\]\s*/g, '').trim();
        cleanText = cleanText.replace(/To send an image back.*?security\.\s*/gs, '').trim();
        
        if (cleanText.startsWith('Read HEARTBEAT.md') || cleanText.startsWith('System:')) return null;
        if (!cleanText || cleanText === 'HEARTBEAT_OK') return null;

        return {
          from: 'otto',
          content: cleanText,
          type: 'text',
          messageId: String(messageId),
          ts: entry.timestamp || new Date().toISOString(),
          source: 'telegram'
        };
      }

      // Other sources (heartbeat, system)
      if (text.startsWith('Read HEARTBEAT.md') || text.startsWith('System:')) return null;
      return null;
    }

    // Assistant message (Kira)
    if (msg.role === 'assistant') {
      let text = '';
      let blocks = [];
      if (typeof msg.content === 'string') {
        text = msg.content;
        blocks = [{ type: 'text', content: msg.content }];
      } else if (Array.isArray(msg.content)) {
        blocks = msg.content.map(c => {
          if (c.type === 'text') return { type: 'text', content: c.text || '' };
          if (c.type === 'thinking') return { type: 'thinking', content: c.thinking || c.text || '' };
          if (c.type === 'toolCall' || c.type === 'tool_use') return { type: 'tool_use', name: c.name || c.toolName || 'tool', input: typeof c.arguments === 'object' ? JSON.stringify(c.arguments, null, 2) : (typeof c.input === 'string' ? c.input : JSON.stringify(c.input || c.args || {}, null, 2)) };
          if (c.type === 'toolResult' || c.type === 'tool_result') return { type: 'tool_result', content: typeof c.output === 'string' ? c.output : (typeof c.content === 'string' ? c.content : JSON.stringify(c.output || c.content || '', null, 2)) };
          return { type: 'text', content: c.text || '' };
        });
        text = blocks.filter(b => b.type === 'text').map(b => b.content).join('\n');
      }
      
      if (!text.trim() && !blocks.some(b => b.type !== 'text')) return null;
      if (text.trim() === 'NO_REPLY' || text.trim() === 'HEARTBEAT_OK') return null;

      // Clean reply tags
      text = text.replace(/\[\[\s*reply_to_current\s*\]\]/g, '').trim();
      text = text.replace(/\[\[\s*reply_to:\s*\d+\s*\]\]/g, '').trim();

      return {
        from: 'kira',
        content: text,
        blocks: blocks,
        type: 'markdown',
        messageId: entry.id,
        ts: entry.timestamp || new Date().toISOString(),
        replySource: lastUserSource // which channel triggered this reply
      };
    }

    return null;
  } catch { return null; }
}

function processNewLines() {
  const sessionFile = getLatestSession();
  if (!sessionFile) return;

  if (sessionFile !== currentSessionFile) {
    currentSessionFile = sessionFile;
    try {
      const content = fs.readFileSync(sessionFile, 'utf8');
      lastLineCount = content.split('\n').filter(l => l.trim()).length;
      console.log(`New session: ${path.basename(sessionFile)}, starting from line ${lastLineCount}`);
    } catch { lastLineCount = 0; }
    return;
  }

  try {
    const content = fs.readFileSync(sessionFile, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length <= lastLineCount) return;

    const newLines = lines.slice(lastLineCount);
    lastLineCount = lines.length;

    for (const line of newLines) {
      const msg = parseSessionLine(line);
      if (!msg) continue;
      if (seenMessageIds.has(msg.messageId)) continue;
      seenMessageIds.add(msg.messageId);

      const source = msg.source || msg.replySource || 'unknown';
      console.log(`→ [${source}] ${msg.from}: ${msg.content.slice(0, 80)}...`);

      // === BIDIRECTIONAL SYNC ===
      
      if (msg.from === 'otto') {
        if (msg.source === 'telegram') {
          // Telegram → WebUI: sync to dashboard
          syncToDashboard(msg);
        }
        // WebUI messages are already in the dashboard (saved by server-v2.js on POST).
        // Mirror WebUI messages to Telegram so Otto sees his own message there too
        if (msg.source === 'webui') {
          sendToTelegram(`📱 ${msg.content}`).then(() => {
            console.log(`[mirror] WebUI→TG: Otto's message mirrored`);
          }).catch(e => console.error('[mirror] Failed to mirror Otto msg to TG:', e.message));
        }
      }

      if (msg.from === 'kira') {
        // Kira's reply: always sync to dashboard (for both sources)
        syncToDashboard(msg);
        
        // Mirror to the OTHER channel
        if (msg.replySource === 'webui') {
          // Reply was triggered by WebUI → mirror to Telegram
          // Only send the text content, not tool blocks
          const textOnly = msg.content.trim();
          if (textOnly && textOnly !== 'NO_REPLY') {
            sendToTelegram(textOnly).then(() => {
              console.log(`[mirror] Kira reply → TG (was WebUI triggered)`);
            }).catch(e => console.error('[mirror] Failed to mirror Kira reply to TG:', e.message));
          }
        }
        // If reply was triggered by Telegram, dashboard sync above handles WebUI.
        // Telegram already got the reply via OpenClaw's --deliver mechanism.
      }
    }
  } catch (e) {
    console.error('Error reading session:', e.message);
  }
}

// HTTP server for dashboard → Telegram forwarding
const server = http.createServer(async (req, res) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  if (req.method === 'OPTIONS') { res.writeHead(204, headers); res.end(); return; }
  
  if (req.url === '/send' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      try {
        const msg = JSON.parse(body);
        // Legacy endpoint — dashboard can still call this directly
        const result = await sendToTelegram(msg.content);
        res.writeHead(200, headers);
        res.end(JSON.stringify({ ok: true, telegram: result.ok }));
      } catch (e) {
        res.writeHead(500, headers);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else {
    res.writeHead(404, headers);
    res.end('{}');
  }
});

const SYNC_PORT = 3848;
server.listen(SYNC_PORT, '127.0.0.1', () => {
  console.log(`Chat sync daemon v2 on :${SYNC_PORT}`);
  console.log(`Bidirectional mirror: WebUI ↔ Telegram`);
  console.log(`Watching: ${SESSIONS_DIR}`);
  
  currentSessionFile = getLatestSession();
  if (currentSessionFile) {
    const content = fs.readFileSync(currentSessionFile, 'utf8');
    lastLineCount = content.split('\n').filter(l => l.trim()).length;
    console.log(`Session: ${path.basename(currentSessionFile)}, lines: ${lastLineCount}`);
  }
  
  setInterval(processNewLines, 500);
});
