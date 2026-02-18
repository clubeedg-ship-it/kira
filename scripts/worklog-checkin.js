#!/usr/bin/env node
// Hourly worklog check-in via Telegram
// Sends inline buttons for quick company tagging + free text prompt
// Stores responses in unified.db worklog table

const https = require('https');
const Database = require('better-sqlite3');
const path = require('path');

const BOT_TOKEN = '8435980250:AAEwxCcK1XD1wpD0NgPqY6t2KGnuBHYFqpQ';
const CHAT_ID = '7985502241';
const DB_PATH = path.join(__dirname, '..', 'memory', 'unified.db');

const COMPANIES = [
  { text: '🎮 IAM', callback_data: 'wl:IAM' },
  { text: '⚡ OttoGen', callback_data: 'wl:OttoGen' },
  { text: '💳 ZenithCred', callback_data: 'wl:ZenithCred' },
  { text: '🧬 Chimera', callback_data: 'wl:Chimera' },
  { text: '🏠 CuttingEdge', callback_data: 'wl:CuttingEdge' },
  { text: '🌿 Abura', callback_data: 'wl:Abura' },
  { text: '🚁 SentinAgro', callback_data: 'wl:SentinAgro' },
  { text: '👤 Personal', callback_data: 'wl:Personal' },
];

function sendCheckin() {
  const hour = new Date().getUTCHours();
  const greeting = hour < 12 ? '🌅' : hour < 18 ? '☀️' : '🌙';
  const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' });

  const data = JSON.stringify({
    chat_id: CHAT_ID,
    text: `${greeting} *${time}* — What are you working on?\n_Tap a company or reply with 1-2 sentences_`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        COMPANIES.slice(0, 4),
        COMPANIES.slice(4, 8),
        [{ text: '⏸️ Break', callback_data: 'wl:Break' }, { text: '🚫 Off', callback_data: 'wl:Off' }]
      ]
    }
  });

  const req = https.request({
    hostname: 'api.telegram.org',
    path: `/bot${BOT_TOKEN}/sendMessage`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, res => {
    let body = '';
    res.on('data', c => body += c);
    res.on('end', () => {
      const r = JSON.parse(body);
      if (r.ok) console.log(`[worklog] Check-in sent at ${time}`);
      else console.error('[worklog] Send failed:', r.description);
    });
  });
  req.write(data);
  req.end();
}

// Log a worklog entry directly
function logEntry(source, company, description) {
  const db = new Database(DB_PATH);
  db.prepare('INSERT INTO worklog (source, company, description) VALUES (?, ?, ?)').run(source, company, description);
  db.close();
  console.log(`[worklog] Logged: ${source}/${company}: ${description}`);
}

// CLI usage
const cmd = process.argv[2];
if (cmd === 'checkin') {
  sendCheckin();
} else if (cmd === 'log') {
  const source = process.argv[3] || 'otto';
  const company = process.argv[4] || 'Oopuo';
  const desc = process.argv.slice(5).join(' ') || 'Working';
  logEntry(source, company, desc);
} else if (cmd === 'status') {
  const db = new Database(DB_PATH, { readonly: true });
  const today = new Date().toISOString().slice(0, 10);
  const entries = db.prepare("SELECT * FROM worklog WHERE timestamp >= ? ORDER BY timestamp DESC").all(today);
  console.log(`Today's worklog (${entries.length} entries):`);
  entries.forEach(e => {
    const t = e.timestamp.slice(11, 16);
    console.log(`  ${t} [${e.company || '?'}] ${e.description} (${e.source})`);
  });
  db.close();
} else {
  console.log('Usage: worklog-checkin.js [checkin|log|status]');
  console.log('  checkin          — Send Telegram check-in');
  console.log('  log <src> <co> <desc> — Log entry directly');
  console.log('  status           — Show today\'s entries');
}
