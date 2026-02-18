#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3851;
const HOME = process.env.HOME || '/home/adminuser';
const AGENTS_DIR = path.join(HOME, '.openclaw', 'agents');
let OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';
if (!OPENROUTER_KEY) {
  try {
    const cfg = fs.readFileSync(path.join(HOME, '.openclaw', 'openclaw.json'), 'utf8');
    const m = cfg.match(/"apiKey":\s*"([^"]+)"/);
    if (m) OPENROUTER_KEY = m[1];
  } catch {}
}
console.log('[agent-log] OpenRouter key:', OPENROUTER_KEY ? OPENROUTER_KEY.substring(0, 12) + '...' : 'MISSING');

// Translation cache
const translationCache = new Map();

async function translateToEnglish(text) {
  if (!text || text.length < 5) return text;
  
  // Only skip if text matches common English patterns strongly
  const enWords = /\b(the|is|are|was|were|have|has|had|will|would|could|should|this|that|with|from|they|their|been|what|when|where|which|there|about|just|like|your|know|more|some|than|them|then|into|over|also|back|after|only|made|most|very|much|good|well|here|still|find|does|doing)\b/gi;
  const enMatches = (text.match(enWords) || []).length;
  const words = text.split(/\s+/).length;
  const enRatio = enMatches / Math.max(words, 1);
  
  // If >30% of words are common English words, skip translation
  if (enRatio > 0.3) { console.log('[translate] Skipping (English):', text.substring(0, 40)); return text; }
  console.log('[translate] Translating:', text.substring(0, 40), 'enRatio:', enRatio.toFixed(2));
  
  // Check cache
  const cacheKey = text.substring(0, 100);
  if (translationCache.has(cacheKey)) return translationCache.get(cacheKey);
  
  try {
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENROUTER_KEY}` },
      body: JSON.stringify({
        model: 'moonshotai/kimi-k2',
        messages: [
          { role: 'system', content: 'Translate the following text to English. Output ONLY the translation, nothing else. If already in English, output it unchanged.' },
          { role: 'user', content: text }
        ],
        max_tokens: 500
      })
    });
    const data = await resp.json();
    const translated = data.choices?.[0]?.message?.content?.trim() || text;
    if (data.error) console.error('[translate] API error:', JSON.stringify(data.error));
    translationCache.set(cacheKey, translated);
    // Cap cache size
    if (translationCache.size > 500) {
      const first = translationCache.keys().next().value;
      translationCache.delete(first);
    }
    return translated;
  } catch(err) {
    console.error('[translate] Error:', err.message || err);
    return text;
  }
}

function getAgentLog(agentId, limit) {
  const sessionsDir = path.join(AGENTS_DIR, agentId, 'sessions');
  if (!fs.existsSync(sessionsDir)) return { error: 'Agent not found', messages: [] };

  const files = fs.readdirSync(sessionsDir)
    .filter(f => f.endsWith('.jsonl'))
    .sort((a, b) => fs.statSync(path.join(sessionsDir, b)).mtimeMs - fs.statSync(path.join(sessionsDir, a)).mtimeMs);

  const messages = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(sessionsDir, file), 'utf8').trim();
    if (!content) continue;
    const lines = content.split('\n');
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.type === 'message' && entry.message) {
          const m = entry.message;
          let text = '';
          if (typeof m.content === 'string') text = m.content;
          else if (Array.isArray(m.content)) text = m.content.filter(c => c.type === 'text').map(c => c.text).join('\n');
          // Clean metadata prefixes from user messages
          if (m.role === 'user') {
            text = text.replace(/^\[Telegram\s+[^\]]*\]\s*/i, '');
            text = text.replace(/^\[(?:Fri|Sat|Sun|Mon|Tue|Wed|Thu)\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+UTC\]\s*/i, '');
            text = text.replace(/^\[WebUI[^\]]*\]\s*/i, '');
            text = text.replace(/\s*\[message_id:\s*\d+\]\s*/g, '');
            text = text.trim();
          }
          // Skip system/empty messages
          if (!text || text === 'HEARTBEAT_OK' || text.startsWith('Read HEARTBEAT.md')) continue;
          if (m.role === 'assistant' && text === 'NO_REPLY') continue;
          if (text && (m.role === 'user' || m.role === 'assistant')) {
            messages.push({ role: m.role, text, ts: entry.timestamp, session: file.replace('.jsonl', '') });
          }
        }
      } catch {}
    }
    if (messages.length >= limit) break;
  }
  return { agent: agentId, messages: messages.slice(-limit) };
}

function listAgents() {
  try {
    return fs.readdirSync(AGENTS_DIR).filter(d => fs.existsSync(path.join(AGENTS_DIR, d, 'sessions')));
  } catch { return []; }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const route = url.pathname;

  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  if (route === '/api/agents') {
    res.writeHead(200, headers);
    res.end(JSON.stringify(listAgents()));
  } else if (route === '/api/log') {
    const agent = url.searchParams.get('agent') || 'stella-debts';
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);
    const translate = url.searchParams.get('translate') !== 'false';
    const data = getAgentLog(agent, limit);
    if (translate && data.messages?.length) {
      Promise.all(data.messages.map(async m => {
        m.original = m.text;
        m.text = await translateToEnglish(m.text);
        return m;
      })).then(msgs => {
        data.messages = msgs;
        res.writeHead(200, headers);
        res.end(JSON.stringify(data));
      }).catch(() => {
        res.writeHead(200, headers);
        res.end(JSON.stringify(data));
      });
    } else {
      res.writeHead(200, headers);
      res.end(JSON.stringify(data));
    }
  } else if (route === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8'));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, '0.0.0.0', () => console.log(`Agent Log viewer on http://0.0.0.0:${PORT}`));
