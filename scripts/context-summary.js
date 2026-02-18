#!/usr/bin/env node
/**
 * Context Summary Script
 * 
 * Extracts recent session messages for short-term memory recovery after 
 * context compaction. Optionally uses local Ollama for AI summarization.
 * 
 * Usage:
 *   node scripts/context-summary.js [--messages N] [--summarize] [--model MODEL]
 * 
 * Options:
 *   --messages N     Number of messages to extract (default: 50)
 *   --summarize      Use Ollama to create AI summary (slow, optional)
 *   --model MODEL    Ollama model (default: granite3.3)
 *   --timeout MS     Ollama timeout in ms (default: 60000)
 * 
 * Output: memory/context-buffer.md
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// Config
const DEFAULT_MESSAGES = 50;
const DEFAULT_MODEL = 'qwen3:8b';
const DEFAULT_TIMEOUT = 600000; // 10 min for qwen3:8b
const WORKSPACE = process.env.CLAWD_WORKSPACE || '/home/adminuser/clawd';
const SESSIONS_DIR = path.join(process.env.HOME, '.clawdbot', 'agents', 'main', 'sessions');
const OUTPUT_FILE = path.join(WORKSPACE, 'memory', 'context-buffer.md');

// Parse args
const args = process.argv.slice(2);
let messageLimit = DEFAULT_MESSAGES;
let model = DEFAULT_MODEL;
let useSummarize = false;
let ollamaTimeout = DEFAULT_TIMEOUT;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--messages' && args[i + 1]) {
    messageLimit = parseInt(args[i + 1], 10);
    i++;
  }
  if (args[i] === '--model' && args[i + 1]) {
    model = args[i + 1];
    i++;
  }
  if (args[i] === '--summarize') {
    useSummarize = true;
  }
  if (args[i] === '--timeout' && args[i + 1]) {
    ollamaTimeout = parseInt(args[i + 1], 10);
    i++;
  }
}

// Find active session log
function findActiveSessionLog() {
  const sessionsFile = path.join(SESSIONS_DIR, 'sessions.json');
  
  if (fs.existsSync(sessionsFile)) {
    try {
      const sessions = JSON.parse(fs.readFileSync(sessionsFile, 'utf8'));
      let mostRecent = null;
      let mostRecentTime = 0;
      
      for (const [key, session] of Object.entries(sessions)) {
        if (session.sessionId && session.updatedAt > mostRecentTime) {
          mostRecentTime = session.updatedAt;
          mostRecent = session.sessionId;
        }
      }
      
      if (mostRecent) {
        const logPath = path.join(SESSIONS_DIR, `${mostRecent}.jsonl`);
        if (fs.existsSync(logPath)) {
          return { sessionId: mostRecent, path: logPath };
        }
      }
    } catch (e) {
      // Fall through
    }
  }
  
  // Fallback: most recently modified .jsonl
  const files = fs.readdirSync(SESSIONS_DIR)
    .filter(f => f.endsWith('.jsonl') && !f.endsWith('.lock'))
    .map(f => ({
      name: f,
      path: path.join(SESSIONS_DIR, f),
      mtime: fs.statSync(path.join(SESSIONS_DIR, f)).mtime
    }))
    .sort((a, b) => b.mtime - a.mtime);
  
  return files.length > 0 
    ? { sessionId: files[0].name.replace('.jsonl', ''), path: files[0].path }
    : null;
}

// Extract user/assistant messages from JSONL
function extractMessages(logPath, limit) {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.trim().split('\n').filter(l => l.trim());
  
  const messages = [];
  
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      
      if (entry.type === 'message' && entry.message) {
        const msg = entry.message;
        
        if (msg.role === 'user' || msg.role === 'assistant') {
          let text = '';
          if (typeof msg.content === 'string') {
            text = msg.content;
          } else if (Array.isArray(msg.content)) {
            text = msg.content
              .filter(p => p.type === 'text')
              .map(p => p.text)
              .join('\n');
          }
          
          if (text.trim()) {
            messages.push({ 
              role: msg.role, 
              text: cleanMessage(text.trim(), msg.role),
              ts: entry.timestamp
            });
          }
        }
      }
    } catch {
      // Skip malformed
    }
  }
  
  return messages.slice(-limit);
}

// Clean message text
function cleanMessage(text, role) {
  if (role === 'user') {
    // Remove Telegram prefix but keep message content
    text = text.replace(/^\[Telegram[^\]]+\]\s*/gm, '');
    // Remove message_id suffix
    text = text.replace(/\[message_id:\s*\d+\]/g, '');
    // Remove System: heartbeat noise
    if (text.includes('Read HEARTBEAT.md if it exists')) {
      return '[heartbeat]';
    }
    // Clean ANSI escapes
    text = text.replace(/\x1b\[[0-9;]*m/g, '');
    text = text.replace(/\][0-9]+;[^\]]*\\/g, '');
  }
  return text.trim();
}

// Generate clean markdown transcript
function generateTranscript(messages) {
  let md = '';
  let lastRole = null;
  
  for (const msg of messages) {
    // Skip heartbeats and empty
    if (msg.text === '[heartbeat]' || !msg.text) continue;
    
    const role = msg.role === 'user' ? '👤' : '🤖';
    
    // Truncate long messages
    let text = msg.text;
    if (text.length > 600) {
      text = text.substring(0, 600) + '...';
    }
    
    md += `${role} ${text}\n\n`;
  }
  
  return md;
}

// Ollama summarization (optional)
async function summarizeWithOllama(messages, model, timeout) {
  // Aggressive truncation for speed
  const transcript = messages
    .filter(m => m.text !== '[heartbeat]')
    .slice(-15)  // Only last 15 messages
    .map(m => `${m.role === 'user' ? 'H' : 'A'}: ${m.text.substring(0, 200)}`)
    .join('\n');
  
  const systemPrompt = `You are a context recovery assistant. Your job is to help an AI resume work after losing conversation history.

OUTPUT FORMAT (use exactly):
## 🎯 Current Task
[What's being worked on right now]

## ✅ Completed
- [Key things done]

## 📋 Next Steps  
- [What needs to happen next]

## 💡 Key Context
- [Important details, configs, decisions]

Be concise. No fluff. Bullet points only.`;

  const prompt = `Summarize this conversation:\n\n${transcript} /no_think`;

  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model,
      system: systemPrompt,
      prompt,
      stream: false,
      keep_alive: '10m',  // KV cache for 10 min
      options: { 
        temperature: 0.3,
        num_predict: 800,
        num_ctx: 4096
      }
    });
    
    const req = http.request({
      hostname: '127.0.0.1',
      port: 11434,
      path: '/api/generate',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body).response || '');
        } catch {
          reject(new Error('Bad response'));
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(timeout, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(data);
    req.end();
  });
}

// Main
async function main() {
  const session = findActiveSessionLog();
  if (!session) {
    console.error('❌ No session found');
    process.exit(1);
  }
  
  console.log(`📝 Extracting ${messageLimit} messages from ${session.sessionId.slice(0,8)}...`);
  
  const messages = extractMessages(session.path, messageLimit);
  if (messages.length === 0) {
    console.log('⚠ No messages');
    process.exit(0);
  }
  
  const now = new Date().toISOString();
  let md = `# Context Buffer\n\n`;
  md += `*${now} | ${messages.length} messages*\n\n---\n\n`;
  
  if (useSummarize) {
    console.log(`🤖 Summarizing with ${model}...`);
    try {
      const summary = await summarizeWithOllama(messages, model, ollamaTimeout);
      md += `## Summary\n\n${summary}\n\n---\n\n`;
      md += `## Raw Transcript\n\n`;
    } catch (e) {
      console.log(`⚠ Summary failed: ${e.message}`);
      md += `## Transcript\n\n`;
    }
  } else {
    md += `## Recent Messages\n\n`;
  }
  
  md += generateTranscript(messages);
  md += `\n---\n*Read this after context compaction to resume work.*\n`;
  
  // Write
  const dir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, md);
  
  console.log(`✅ ${OUTPUT_FILE} (${(fs.statSync(OUTPUT_FILE).size/1024).toFixed(1)}KB)`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
