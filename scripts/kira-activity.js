#!/usr/bin/env node
/**
 * Kira Activity Notifier
 * 
 * Sends activity summaries to @chimera_activity_bot
 * 
 * Usage: node kira-activity.js "Activity summary here"
 */

import https from 'https';

const BOT_TOKEN = '8238580898:AAF0aGxRFJadbspS0VEJLc5g6tH9fLpOVsQ';
const CHAT_ID = '7985502241';

function sendActivity(message) {
  const text = `🤖 **Kira Activity**\n\n${message}\n\n_${new Date().toISOString()}_`;
  
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
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`Telegram error: ${body}`));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Main
const message = process.argv.slice(2).join(' ');
if (!message) {
  console.log('Usage: node kira-activity.js "Your activity summary"');
  process.exit(1);
}

sendActivity(message)
  .then(() => console.log('✅ Activity posted'))
  .catch(err => console.error('❌ Failed:', err.message));
