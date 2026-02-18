#!/usr/bin/env node
/**
 * Telegram User Client - BotFather Automation
 * 
 * Uses MTProto (user account) to interact with BotFather.
 * First run requires phone authentication.
 * 
 * Usage:
 *   node telegram-user-client.js login              # One-time login
 *   node telegram-user-client.js create-bot <json>  # Create a bot
 *   node telegram-user-client.js status             # Check session status
 * 
 * Create bot JSON format:
 * {
 *   "name": "My Bot Display Name",
 *   "usernames": ["mybot", "my_bot_v2", "my_bot_v3"]
 * }
 */

const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Telegram API credentials (get from https://my.telegram.org)
// These are public test credentials - Otto should replace with his own
const API_ID = parseInt(process.env.TELEGRAM_API_ID) || 0;
const API_HASH = process.env.TELEGRAM_API_HASH || '';

const SESSION_FILE = path.join(process.env.HOME, '.clawdbot', 'telegram-user-session.txt');
const BOTFATHER_USERNAME = 'BotFather';

class TelegramUserClient {
  constructor() {
    this.client = null;
    this.session = new StringSession(this.loadSession());
  }

  loadSession() {
    try {
      if (fs.existsSync(SESSION_FILE)) {
        return fs.readFileSync(SESSION_FILE, 'utf-8').trim();
      }
    } catch (e) {}
    return '';
  }

  saveSession(session) {
    const dir = path.dirname(SESSION_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SESSION_FILE, session);
    console.log(`✅ Session saved to ${SESSION_FILE}`);
  }

  async prompt(question) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    return new Promise(resolve => {
      rl.question(question, answer => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }

  async connect() {
    if (!API_ID || !API_HASH) {
      console.error(`
❌ Missing Telegram API credentials!

To get your API credentials:
1. Go to https://my.telegram.org
2. Log in with your phone number
3. Go to "API development tools"
4. Create a new application
5. Copy the api_id and api_hash

Then set environment variables:
  export TELEGRAM_API_ID=your_api_id
  export TELEGRAM_API_HASH=your_api_hash

Or add to ~/.clawdbot/clawdbot.json:
{
  "telegram_api_id": your_api_id,
  "telegram_api_hash": "your_api_hash"
}
`);
      process.exit(1);
    }

    this.client = new TelegramClient(this.session, API_ID, API_HASH, {
      connectionRetries: 5,
    });

    await this.client.start({
      phoneNumber: async () => await this.prompt('📱 Phone number (with country code): '),
      password: async () => await this.prompt('🔐 2FA password (if enabled): '),
      phoneCode: async () => await this.prompt('📟 Code from Telegram: '),
      onError: (err) => console.error('Error:', err),
    });

    // Save session for future use
    this.saveSession(this.client.session.save());
    console.log('✅ Connected to Telegram!');
  }

  async ensureConnected() {
    if (!this.client) {
      await this.connect();
    } else if (!this.client.connected) {
      await this.client.connect();
    }
  }

  async sendToBotFather(text) {
    await this.ensureConnected();
    
    const result = await this.client.sendMessage(BOTFATHER_USERNAME, { message: text });
    console.log(`→ Sent: ${text}`);
    return result;
  }

  async waitForBotFatherReply(afterMessageId, timeoutMs = 30000) {
    await this.ensureConnected();
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      // Get messages from BotFather
      const messages = await this.client.getMessages(BOTFATHER_USERNAME, { limit: 5 });
      
      for (const msg of messages) {
        // Find a reply after our message (BotFather messages have fromId: null)
        if (msg.id > afterMessageId && msg.fromId === null) {
          console.log(`← BotFather: ${msg.text?.substring(0, 100)}...`);
          return msg;
        }
      }
      
      await new Promise(r => setTimeout(r, 1000));
    }
    
    throw new Error('Timeout waiting for BotFather reply');
  }

  parseToken(text) {
    const match = text.match(/(\d{8,}:[A-Za-z0-9_-]{35})/);
    return match ? match[1] : null;
  }

  async createBot(config) {
    console.log('\n🤖 Creating new Telegram bot...\n');
    console.log(`Name: ${config.name}`);
    console.log(`Username options: ${config.usernames.join(', ')}\n`);

    // Validate usernames
    for (const username of config.usernames) {
      if (!username.toLowerCase().endsWith('bot')) {
        throw new Error(`Username "${username}" must end with "bot"`);
      }
    }

    await this.ensureConnected();

    // Step 1: /newbot
    console.log('Step 1: Sending /newbot...');
    let sent = await this.sendToBotFather('/newbot');
    let reply = await this.waitForBotFatherReply(sent.id);

    // Step 2: Send name
    console.log('Step 2: Sending bot name...');
    sent = await this.sendToBotFather(config.name);
    reply = await this.waitForBotFatherReply(sent.id);

    // Step 3: Try usernames
    for (const username of config.usernames) {
      console.log(`Step 3: Trying username @${username}...`);
      sent = await this.sendToBotFather(username);
      reply = await this.waitForBotFatherReply(sent.id);

      // Check if successful (contains token)
      const token = this.parseToken(reply.text);
      if (token) {
        console.log('\n✅ Bot created successfully!');
        console.log(`\nBot username: @${username}`);
        console.log(`Token: ${token}\n`);

        // Save bot info
        const botInfo = {
          name: config.name,
          username: username,
          token: token,
          created: new Date().toISOString()
        };

        const botsFile = path.join(process.env.HOME, '.clawdbot', 'bots.json');
        let bots = [];
        try {
          bots = JSON.parse(fs.readFileSync(botsFile, 'utf-8'));
        } catch (e) {}
        bots.push(botInfo);
        fs.writeFileSync(botsFile, JSON.stringify(bots, null, 2));
        console.log(`Bot info saved to ${botsFile}`);

        return botInfo;
      }

      // Check if username was taken
      if (reply.text.includes('already been taken') || reply.text.includes('occupied')) {
        console.log(`   ❌ @${username} is taken, trying next...`);
        continue;
      }

      // Check for other errors
      if (reply.text.includes('invalid') || reply.text.includes('error')) {
        console.log(`   ❌ Invalid username: ${reply.text.substring(0, 100)}`);
        continue;
      }
    }

    throw new Error('All username options were taken or invalid');
  }

  async status() {
    if (!this.session.save()) {
      console.log('❌ Not logged in. Run: node telegram-user-client.js login');
      return false;
    }

    try {
      await this.ensureConnected();
      const me = await this.client.getMe();
      console.log(`✅ Logged in as: ${me.firstName} ${me.lastName || ''} (@${me.username || 'no username'})`);
      console.log(`   Phone: ${me.phone}`);
      return true;
    } catch (e) {
      console.log('❌ Session invalid. Run: node telegram-user-client.js login');
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
    }
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const client = new TelegramUserClient();

  try {
    switch (command) {
      case 'login':
        await client.connect();
        await client.status();
        break;

      case 'status':
        await client.status();
        break;

      case 'create-bot':
        const configArg = args[1];
        if (!configArg) {
          console.error('Usage: node telegram-user-client.js create-bot \'{"name":"Bot","usernames":["mybot"]}\'');
          console.error('   or: node telegram-user-client.js create-bot config.json');
          process.exit(1);
        }

        let config;
        if (configArg.startsWith('{')) {
          config = JSON.parse(configArg);
        } else {
          config = JSON.parse(fs.readFileSync(configArg, 'utf-8'));
        }

        const bot = await client.createBot(config);
        console.log('\nBot created:', JSON.stringify(bot, null, 2));
        break;

      default:
        console.log(`
Telegram User Client - BotFather Automation

Commands:
  login              Authenticate with your Telegram account (one-time)
  status             Check if logged in
  create-bot <json>  Create a new bot via BotFather

Examples:
  node telegram-user-client.js login
  node telegram-user-client.js create-bot '{"name":"My Bot","usernames":["mybot","my_bot_v2"]}'
  node telegram-user-client.js create-bot bot-config.json

First, set your API credentials (from https://my.telegram.org):
  export TELEGRAM_API_ID=your_id
  export TELEGRAM_API_HASH=your_hash
`);
    }
  } finally {
    await client.disconnect();
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
