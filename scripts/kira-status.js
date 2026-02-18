#!/usr/bin/env node
/**
 * Kira Status Poster
 * 
 * Posts real-time status updates to @chimera_activity_bot
 * Uses tiny model (qwen2.5:0.5b) to summarize if needed
 * 
 * Usage: 
 *   node kira-status.js "researching topic X"
 *   node kira-status.js --summarize "long text to summarize"
 */

import https from 'https';
import { execSync } from 'child_process';

const BOT_TOKEN = '8238580898:AAF0aGxRFJadbspS0VEJLc5g6tH9fLpOVsQ';
const CHAT_ID = '7985502241';

function sendStatus(status) {
  const time = new Date().toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC'
  });
  
  const text = `⚡ *Kira* [${time} UTC]\n${status}`;
  
  const data = JSON.stringify({
    chat_id: CHAT_ID,
    text: text,
    parse_mode: 'Markdown'
  });

  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${BOT_TOKEN}/sendMessage`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          reject(new Error(`Telegram: ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function summarize(text) {
  try {
    const prompt = `Summarize in one short sentence: ${text.slice(0, 500)}`;
    const result = execSync(
      `echo "${prompt.replace(/"/g, '\\"')}" | ollama run qwen2.5:0.5b 2>/dev/null`,
      { timeout: 30000, maxBuffer: 1024 * 1024 }
    ).toString().trim();
    return result.split('\n')[0].slice(0, 200);
  } catch {
    return text.slice(0, 100);
  }
}

// Main
const args = process.argv.slice(2);
let status = '';

if (args[0] === '--summarize') {
  status = summarize(args.slice(1).join(' '));
} else {
  status = args.join(' ');
}

if (!status) {
  console.log('Usage: node kira-status.js "status message"');
  process.exit(1);
}

sendStatus(status)
  .then(() => console.log('✓ Posted'))
  .catch(err => console.error('✗', err.message));
