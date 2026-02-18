#!/usr/bin/env node
/**
 * Moltbot Provisioning Script
 * 
 * Creates and configures new Telegram bots for the Chimera ecosystem.
 * 
 * Usage:
 *   node moltbot-provision.js new <name>           # Start new bot wizard
 *   node moltbot-provision.js register <token>     # Register existing bot token
 *   node moltbot-provision.js list                 # List all provisioned bots
 *   node moltbot-provision.js test <bot_username>  # Test a bot's connection
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BOTS_FILE = path.join(process.env.HOME, '.clawdbot', 'moltbots.json');
const CHIMERA_DIR = path.join(process.env.HOME, 'chimera');

function loadBots() {
  try {
    if (fs.existsSync(BOTS_FILE)) {
      return JSON.parse(fs.readFileSync(BOTS_FILE, 'utf-8'));
    }
  } catch (e) {}
  return [];
}

function saveBots(bots) {
  const dir = path.dirname(BOTS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(BOTS_FILE, JSON.stringify(bots, null, 2));
}

function generateUsername(name) {
  // Convert name to valid bot username
  let base = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  
  // Remove trailing 'bot' if present to avoid duplication
  base = base.replace(/_?bot$/, '');
  
  return [
    `${base}_bot`,
    `${base}bot`,
    `chimera_${base}_bot`,
    `${base}_moltbot`
  ];
}

async function newBot(name) {
  console.log('\n🤖 New Moltbot Provisioning\n');
  console.log(`Bot name: ${name}`);
  
  const usernames = generateUsername(name);
  console.log(`\nSuggested usernames (in order of preference):`);
  usernames.forEach((u, i) => console.log(`  ${i + 1}. @${u}`));

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Instructions - Send these to @BotFather:

1️⃣  /newbot

2️⃣  ${name}

3️⃣  ${usernames[0]}
    (if taken, try: ${usernames[1]})
    (if taken, try: ${usernames[2]})

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

After you receive the token, run:

  node scripts/moltbot-provision.js register <TOKEN> --name "${name}" --username <chosen_username>

Or just:

  node scripts/moltbot-provision.js register <TOKEN>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

  // Save pending bot
  const pending = {
    name,
    suggestedUsernames: usernames,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  const pendingFile = path.join(process.env.HOME, '.clawdbot', 'pending-bot.json');
  fs.writeFileSync(pendingFile, JSON.stringify(pending, null, 2));
  console.log(`Pending bot saved. After getting the token, run the register command.\n`);
}

async function registerBot(token, options = {}) {
  console.log('\n🔑 Registering Moltbot Token\n');

  // Validate token format
  if (!/^\d{8,}:[A-Za-z0-9_-]{35}$/.test(token)) {
    console.error('❌ Invalid token format. Expected: 123456789:ABCdefGHI...');
    process.exit(1);
  }

  // Get bot info from Telegram
  console.log('Fetching bot info from Telegram...');
  let botInfo;
  try {
    const response = execSync(`curl -s "https://api.telegram.org/bot${token}/getMe"`, { encoding: 'utf-8' });
    const data = JSON.parse(response);
    if (!data.ok) {
      throw new Error(data.description || 'Invalid token');
    }
    botInfo = data.result;
    console.log(`✅ Verified: @${botInfo.username} (${botInfo.first_name})`);
  } catch (e) {
    console.error(`❌ Failed to verify token: ${e.message}`);
    process.exit(1);
  }

  // Load pending bot info if exists
  const pendingFile = path.join(process.env.HOME, '.clawdbot', 'pending-bot.json');
  let pending = {};
  try {
    pending = JSON.parse(fs.readFileSync(pendingFile, 'utf-8'));
    fs.unlinkSync(pendingFile);
  } catch (e) {}

  // Create bot record
  const bot = {
    id: botInfo.id,
    username: botInfo.username,
    name: options.name || pending.name || botInfo.first_name,
    token: token,
    status: 'active',
    registeredAt: new Date().toISOString(),
    config: {
      canJoinGroups: botInfo.can_join_groups,
      canReadAllGroupMessages: botInfo.can_read_all_group_messages,
      supportsInlineQueries: botInfo.supports_inline_queries
    }
  };

  // Save to bots list
  const bots = loadBots();
  const existingIndex = bots.findIndex(b => b.id === bot.id);
  if (existingIndex >= 0) {
    bots[existingIndex] = bot;
    console.log('Updated existing bot record.');
  } else {
    bots.push(bot);
    console.log('Added new bot to registry.');
  }
  saveBots(bots);

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Bot Registered Successfully!

  Name:     ${bot.name}
  Username: @${bot.username}
  ID:       ${bot.id}
  Token:    ${token.substring(0, 15)}...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Next steps:

1. Add to Clawdbot config (for standalone moltbot):
   clawdbot gateway config.apply --patch '{"telegram":{"token":"${token}"}}'

2. Or add as a Chimera savant bot:
   Edit ~/chimera/config/bots.json

3. Set webhook (if needed):
   curl "https://api.telegram.org/bot${token}/setWebhook?url=YOUR_WEBHOOK_URL"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

  return bot;
}

function listBots() {
  const bots = loadBots();
  
  if (bots.length === 0) {
    console.log('\n📋 No moltbots registered yet.\n');
    console.log('Create one with: node moltbot-provision.js new "Bot Name"\n');
    return;
  }

  console.log('\n📋 Registered Moltbots\n');
  console.log('━'.repeat(60));
  
  for (const bot of bots) {
    const statusIcon = bot.status === 'active' ? '🟢' : '🔴';
    console.log(`${statusIcon} @${bot.username}`);
    console.log(`   Name: ${bot.name}`);
    console.log(`   ID: ${bot.id}`);
    console.log(`   Token: ${bot.token.substring(0, 15)}...`);
    console.log(`   Registered: ${bot.registeredAt}`);
    console.log('');
  }
  
  console.log('━'.repeat(60));
  console.log(`Total: ${bots.length} bot(s)\n`);
}

async function testBot(username) {
  const bots = loadBots();
  const bot = bots.find(b => b.username === username || b.username === username.replace('@', ''));
  
  if (!bot) {
    console.error(`❌ Bot @${username} not found in registry.`);
    console.log('Run: node moltbot-provision.js list');
    process.exit(1);
  }

  console.log(`\n🧪 Testing @${bot.username}...\n`);

  try {
    // Test getMe
    const response = execSync(`curl -s "https://api.telegram.org/bot${bot.token}/getMe"`, { encoding: 'utf-8' });
    const data = JSON.parse(response);
    
    if (data.ok) {
      console.log('✅ Bot is responding');
      console.log(`   Username: @${data.result.username}`);
      console.log(`   Name: ${data.result.first_name}`);
    } else {
      console.log('❌ Bot not responding:', data.description);
    }

    // Test getUpdates
    const updates = execSync(`curl -s "https://api.telegram.org/bot${bot.token}/getUpdates?limit=1"`, { encoding: 'utf-8' });
    const updatesData = JSON.parse(updates);
    
    if (updatesData.ok) {
      console.log(`✅ Can receive updates (${updatesData.result.length} pending)`);
    }

    // Check webhook
    const webhook = execSync(`curl -s "https://api.telegram.org/bot${bot.token}/getWebhookInfo"`, { encoding: 'utf-8' });
    const webhookData = JSON.parse(webhook);
    
    if (webhookData.ok) {
      if (webhookData.result.url) {
        console.log(`📡 Webhook: ${webhookData.result.url}`);
      } else {
        console.log('📡 Webhook: Not set (using polling)');
      }
    }

    console.log('\n✅ All tests passed!\n');

  } catch (e) {
    console.error(`❌ Test failed: ${e.message}`);
    process.exit(1);
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'new':
      if (!args[1]) {
        console.error('Usage: node moltbot-provision.js new "Bot Name"');
        process.exit(1);
      }
      await newBot(args.slice(1).join(' '));
      break;

    case 'register':
      if (!args[1]) {
        console.error('Usage: node moltbot-provision.js register <TOKEN> [--name "Name"] [--username username]');
        process.exit(1);
      }
      const options = {};
      for (let i = 2; i < args.length; i++) {
        if (args[i] === '--name' && args[i + 1]) {
          options.name = args[++i];
        } else if (args[i] === '--username' && args[i + 1]) {
          options.username = args[++i];
        }
      }
      await registerBot(args[1], options);
      break;

    case 'list':
      listBots();
      break;

    case 'test':
      if (!args[1]) {
        console.error('Usage: node moltbot-provision.js test <bot_username>');
        process.exit(1);
      }
      await testBot(args[1]);
      break;

    default:
      console.log(`
Moltbot Provisioning Script

Commands:
  new <name>           Start wizard to create a new bot
  register <token>     Register an existing bot token
  list                 List all provisioned bots
  test <username>      Test a bot's connection

Examples:
  node moltbot-provision.js new "Interior Design Bot"
  node moltbot-provision.js register 123456789:ABCdef...
  node moltbot-provision.js list
  node moltbot-provision.js test interior_design_bot
`);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
