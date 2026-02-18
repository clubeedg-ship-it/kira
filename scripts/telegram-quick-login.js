#!/usr/bin/env node
/**
 * Quick Telegram Login - File-based code input
 * Reads code from /tmp/tg-code.txt to avoid message latency
 */

const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const fs = require('fs');
const path = require('path');

const API_ID = parseInt(process.env.TELEGRAM_API_ID) || 39791471;
const API_HASH = process.env.TELEGRAM_API_HASH || '1406f7b0d180513850161708dfde1c07';
const PHONE = process.argv[2];
const SESSION_FILE = path.join(process.env.HOME, '.clawdbot', 'telegram-user-session.txt');
const CODE_FILE = '/tmp/tg-code.txt';

if (!PHONE) {
  console.log('Usage: node telegram-quick-login.js +31634753257');
  process.exit(1);
}

async function waitForCodeFile(timeoutMs = 120000) {
  const start = Date.now();
  console.log(`\n⏳ Waiting for code in ${CODE_FILE}`);
  console.log('   Write the code to this file when you receive it.\n');
  
  // Clear any old code
  try { fs.unlinkSync(CODE_FILE); } catch(e) {}
  
  while (Date.now() - start < timeoutMs) {
    try {
      if (fs.existsSync(CODE_FILE)) {
        const code = fs.readFileSync(CODE_FILE, 'utf-8').trim();
        if (code && /^\d{5}$/.test(code)) {
          console.log(`✅ Got code: ${code}`);
          fs.unlinkSync(CODE_FILE);
          return code;
        }
      }
    } catch(e) {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('Timeout waiting for code');
}

async function main() {
  console.log('🔐 Telegram Quick Login\n');
  console.log(`Phone: ${PHONE}`);
  console.log(`API ID: ${API_ID}`);
  
  const session = new StringSession('');
  const client = new TelegramClient(session, API_ID, API_HASH, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => PHONE,
    password: async () => {
      // If 2FA is enabled
      const pwFile = '/tmp/tg-password.txt';
      console.log(`\n🔐 2FA required! Write password to ${pwFile}`);
      while (!fs.existsSync(pwFile)) {
        await new Promise(r => setTimeout(r, 500));
      }
      const pw = fs.readFileSync(pwFile, 'utf-8').trim();
      fs.unlinkSync(pwFile);
      return pw;
    },
    phoneCode: waitForCodeFile,
    onError: (err) => console.error('Error:', err.message),
  });

  // Save session
  const dir = path.dirname(SESSION_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SESSION_FILE, client.session.save());
  
  const me = await client.getMe();
  console.log(`\n✅ Logged in as: ${me.firstName} (@${me.username})`);
  console.log(`Session saved to: ${SESSION_FILE}`);
  
  await client.disconnect();
}

main().catch(e => {
  console.error('Failed:', e.message);
  process.exit(1);
});
