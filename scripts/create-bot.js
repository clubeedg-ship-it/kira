#!/usr/bin/env node
/**
 * Simple BotFather Bot Creator
 * 
 * Usage: node create-bot.js "Bot Name" username1 username2 username3
 * 
 * Just sends messages in sequence, waits for replies, done.
 */

const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const fs = require('fs');
const path = require('path');

const API_ID = 39791471;
const API_HASH = '1406f7b0d180513850161708dfde1c07';
const SESSION_FILE = path.join(process.env.HOME, '.clawdbot', 'telegram-user-session.txt');
const BOTS_FILE = path.join(process.env.HOME, '.clawdbot', 'moltbots.json');

async function createBot(name, usernames) {
  const session = fs.readFileSync(SESSION_FILE, 'utf-8').trim();
  const client = new TelegramClient(new StringSession(session), API_ID, API_HASH, { connectionRetries: 3 });
  
  await client.connect();
  let lastMsgId = 0;

  const send = async (text) => {
    const result = await client.sendMessage('BotFather', { message: text });
    lastMsgId = result.id;
    console.log(`→ ${text}`);
    return result;
  };

  const waitReply = async () => {
    for (let i = 0; i < 60; i++) { // 30 seconds max
      await new Promise(r => setTimeout(r, 500));
      const msgs = await client.getMessages('BotFather', { limit: 3 });
      for (const m of msgs) {
        if (m.id > lastMsgId && m.fromId === null) {
          console.log(`← ${m.text.substring(0, 80)}...`);
          return m.text;
        }
      }
    }
    throw new Error('Timeout');
  };

  // Flow
  await send('/newbot');
  await waitReply();
  
  await send(name);
  await waitReply();

  for (const username of usernames) {
    await send(username);
    const reply = await waitReply();
    
    const tokenMatch = reply.match(/(\d{8,}:[A-Za-z0-9_-]{35})/);
    if (tokenMatch) {
      const token = tokenMatch[1];
      console.log(`\n✅ @${username} created!`);
      console.log(`Token: ${token}`);
      
      // Save
      let bots = [];
      try { bots = JSON.parse(fs.readFileSync(BOTS_FILE, 'utf-8')); } catch(e) {}
      bots.push({ name, username, token, created: new Date().toISOString() });
      fs.writeFileSync(BOTS_FILE, JSON.stringify(bots, null, 2));
      
      await client.disconnect();
      return { name, username, token };
    }
    
    if (reply.includes('already') || reply.includes('occupied')) {
      console.log(`   (taken, trying next)`);
      continue;
    }
  }

  await client.disconnect();
  throw new Error('All usernames taken');
}

// CLI
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node create-bot.js "Bot Name" username1 [username2] [username3]');
  console.log('Example: node create-bot.js "My Bot" mybot my_bot mybot_v2');
  process.exit(1);
}

const name = args[0];
const usernames = args.slice(1).map(u => u.endsWith('bot') ? u : u + '_bot');

createBot(name, usernames)
  .then(bot => console.log('\nDone:', JSON.stringify(bot)))
  .catch(e => { console.error('Failed:', e.message); process.exit(1); });
