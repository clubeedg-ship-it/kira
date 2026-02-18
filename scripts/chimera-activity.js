#!/usr/bin/env node
/**
 * Chimera Activity Forwarder
 * 
 * Checks for pending Chimera savant activity and sends to @chimera_activity_bot.
 * Run on heartbeat.
 * 
 * Usage: node chimera-activity.js [--stdout]
 *   --stdout: Print to stdout instead of sending to Telegram
 */

import fs from 'fs/promises';
import path from 'path';
import https from 'https';

const VDR_PATH = '/home/adminuser/chimera/vdr';
const ACTIVITY_DIR = path.join(VDR_PATH, 'activity');
const STREAM_FILE = path.join(ACTIVITY_DIR, 'stream.jsonl');
const MARKER_FILE = path.join(ACTIVITY_DIR, '.last_forwarded');

// Chimera Activity Bot
const BOT_TOKEN = '8238580898:AAF0aGxRFJadbspS0VEJLc5g6tH9fLpOVsQ';
const CHAT_ID = '7985502241';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

const SAVANT_EMOJI = {
  consultant: '🧠',
  observer: '👁️',
  analyzer: '🔍',
  generator: '⚡',
  tester: '🧪',
  deployer: '🚀',
  'meta-thinker': '🎯',
  'error-recovery': '🔧',
  curator: '📚'
};

const STATUS_EMOJI = {
  info: '📋',
  thinking: '🤔',
  success: '✅',
  error: '❌',
  warning: '⚠️'
};

async function sendToTelegram(text) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      chat_id: CHAT_ID,
      text: text,
      parse_mode: 'Markdown'
    });

    const req = https.request(TELEGRAM_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function formatRecord(record) {
  const savantEmoji = SAVANT_EMOJI[record.savant] || '🤖';
  const statusEmoji = STATUS_EMOJI[record.status] || '📋';
  
  let msg = `${savantEmoji} **[${record.savant}]** ${record.action}`;
  
  if (record.thinking) {
    msg += `\n   💭 _${record.thinking}_`;
  }
  
  if (record.result) {
    const resultStr = typeof record.result === 'string' 
      ? record.result 
      : JSON.stringify(record.result);
    msg += `\n   ${statusEmoji} ${resultStr.substring(0, 200)}`;
  }
  
  if (record.duration) {
    msg += `\n   ⏱️ ${record.duration}`;
  }
  
  return msg;
}

async function main() {
  try {
    // Get last forwarded timestamp
    let lastForwarded = null;
    try {
      lastForwarded = await fs.readFile(MARKER_FILE, 'utf8');
      lastForwarded = lastForwarded.trim();
    } catch {
      // No marker yet
    }
    
    // Read stream
    let content;
    try {
      content = await fs.readFile(STREAM_FILE, 'utf8');
    } catch {
      // No activity yet
      process.exit(0);
    }
    
    const lines = content.trim().split('\n').filter(l => l);
    const records = lines.map(l => {
      try { return JSON.parse(l); } catch { return null; }
    }).filter(r => r);
    
    // Filter to only new records
    let pending = records;
    if (lastForwarded) {
      const lastDate = new Date(lastForwarded);
      pending = records.filter(r => new Date(r.timestamp) > lastDate);
    }
    
    if (pending.length === 0) {
      process.exit(0);
    }
    
    // Send to Telegram or stdout
    const useStdout = process.argv.includes('--stdout');
    let sent = 0;
    
    for (const record of pending) {
      const message = formatRecord(record);
      
      if (useStdout) {
        console.log(message);
        console.log();
      } else {
        try {
          const result = await sendToTelegram(message);
          if (result.ok) {
            sent++;
          } else {
            console.error('Telegram error:', result.description);
          }
          // Small delay to avoid rate limiting
          await new Promise(r => setTimeout(r, 100));
        } catch (err) {
          console.error('Failed to send:', err.message);
        }
      }
    }
    
    if (!useStdout && sent > 0) {
      console.log(`Sent ${sent} activities to @chimera_activity_bot`);
    }
    
    // Update marker
    await fs.writeFile(MARKER_FILE, pending[pending.length - 1].timestamp);
    
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
