#!/usr/bin/env node
/**
 * Telegram Voice Interceptor
 * 
 * Polls Telegram bots for voice/audio messages that OpenClaw drops,
 * transcribes via local Whisper, and injects text back via OpenClaw CLI.
 * 
 * Coexists with OpenClaw by only consuming voice/audio updates.
 * Text messages are left for OpenClaw to handle.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const HOME = process.env.HOME || '/home/adminuser';
const WHISPER_URL = 'http://localhost:3853/transcribe-file';
const POLL_INTERVAL = 3000;

function log(msg) { console.log(`[voice] ${new Date().toISOString().slice(11, 19)} ${msg}`); }

function loadBots() {
  const cfg = JSON.parse(fs.readFileSync(path.join(HOME, '.openclaw', 'openclaw.json'), 'utf8'));
  const tg = cfg.channels?.telegram;
  if (!tg?.enabled) return [];
  const bots = [];
  if (tg.botToken) bots.push({ agentId: 'main', token: tg.botToken, lastVoiceId: 0 });
  if (tg.accounts) {
    for (const [id, acc] of Object.entries(tg.accounts)) {
      if (acc.enabled && acc.botToken) bots.push({ agentId: id, token: acc.botToken, lastVoiceId: 0 });
    }
  }
  return bots;
}

async function tgApi(token, method, params = {}) {
  const resp = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  return resp.json();
}

async function downloadFile(token, fileId) {
  const info = await tgApi(token, 'getFile', { file_id: fileId });
  if (!info.ok) return null;
  const resp = await fetch(`https://api.telegram.org/file/bot${token}/${info.result.file_path}`);
  if (!resp.ok) return null;
  const ext = path.extname(info.result.file_path) || '.oga';
  const tmp = `/tmp/voice_${Date.now()}${ext}`;
  fs.writeFileSync(tmp, Buffer.from(await resp.arrayBuffer()));
  return tmp;
}

async function transcribe(filePath) {
  const resp = await fetch(WHISPER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: filePath })
  });
  if (!resp.ok) throw new Error(`Whisper ${resp.status}`);
  return resp.json();
}

function injectMessage(agentId, chatId, senderName, text, lang) {
  // Format as a voice transcription
  const msg = `[Voice from ${senderName} (${lang})]: ${text}`;
  try {
    const agentFlag = agentId === 'main' ? '' : ` --agent ${agentId}`;
    const escaped = msg.replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`');
    execSync(`openclaw agent${agentFlag} --message "${escaped}" --channel telegram`, {
      timeout: 30000,
      stdio: 'pipe'
    });
    log(`[${agentId}] Injected → "${text.substring(0, 60)}..."`);
    return true;
  } catch (err) {
    log(`[${agentId}] Inject failed: ${err.message?.substring(0, 100)}`);
    return false;
  }
}

// Use getUpdates with peek (no offset commit) to check for voice messages
// Then selectively process voice and skip text (let OpenClaw handle text)
async function checkBot(bot) {
  try {
    // Peek at updates without committing offset
    const data = await tgApi(bot.token, 'getUpdates', {
      timeout: 1,
      limit: 10,
      allowed_updates: ['message']
    });
    
    if (!data.ok || !data.result?.length) return;
    
    for (const update of data.result) {
      const msg = update.message;
      if (!msg) continue;
      
      const voice = msg.voice || msg.audio;
      if (!voice) continue;
      
      // Skip if we already processed this
      if (update.update_id <= bot.lastVoiceId) continue;
      bot.lastVoiceId = update.update_id;
      
      const senderName = msg.from?.first_name || msg.from?.username || 'Unknown';
      const duration = voice.duration || 0;
      log(`[${bot.agentId}] 🎤 Voice from ${senderName} (${duration}s)`);
      
      // Download
      const audioPath = await downloadFile(bot.token, voice.file_id);
      if (!audioPath) { log(`[${bot.agentId}] Download failed`); continue; }
      
      try {
        const result = await transcribe(audioPath);
        if (result.text?.trim()) {
          log(`[${bot.agentId}] 📝 "${result.text.substring(0, 80)}" [${result.language}]`);
          injectMessage(bot.agentId, msg.chat.id, senderName, result.text.trim(), result.language || '?');
        } else {
          log(`[${bot.agentId}] Empty transcription`);
        }
      } catch (err) {
        log(`[${bot.agentId}] Transcribe error: ${err.message}`);
      } finally {
        try { fs.unlinkSync(audioPath); } catch {}
      }
    }
  } catch (err) {
    // 409 Conflict = OpenClaw is polling. That's expected and fine.
    if (err.message?.includes('409') || err.message?.includes('Conflict')) return;
    log(`[${bot.agentId}] Error: ${err.message?.substring(0, 100)}`);
  }
}

async function main() {
  const bots = loadBots();
  log(`Loaded ${bots.length} bots: ${bots.map(b => b.agentId).join(', ')}`);
  
  // NOTE: This will conflict with OpenClaw's polling (409 errors).
  // OpenClaw consumes text updates; we try to catch voice updates.
  // If OpenClaw processes the voice update first (as <media:audio>), 
  // we won't see it. If we process it first, OpenClaw won't see it.
  //
  // This is a race condition by design. The interceptor wins sometimes,
  // OpenClaw wins sometimes. We track lastVoiceId to avoid duplicates.
  
  log('Starting voice interceptor polling...');
  
  const poll = async () => {
    await Promise.allSettled(bots.map(b => checkBot(b)));
  };
  
  // Initial check
  await poll();
  
  // Regular polling
  setInterval(poll, POLL_INTERVAL);
}

main().catch(err => { log(`Fatal: ${err.message}`); process.exit(1); });
