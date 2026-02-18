#!/usr/bin/env node
/**
 * BotFather Automation Script
 * 
 * Creates a new Telegram bot by automating the BotFather conversation.
 * 
 * Usage:
 *   node botfather-create.js --name "My Bot" --usernames "mybot,mybot_2,mybot_v2"
 *   node botfather-create.js --config bot-config.json
 * 
 * Config JSON format:
 * {
 *   "name": "My Bot Display Name",
 *   "usernames": ["preferred_bot", "fallback_bot", "another_option_bot"],
 *   "description": "Optional bot description",
 *   "about": "Optional about text"
 * }
 * 
 * Note: All usernames must end with 'bot' (Telegram requirement)
 */

const fs = require('fs');
const path = require('path');

// BotFather chat ID
const BOTFATHER_ID = 93372553; // @BotFather's numeric ID

class BotFatherAutomation {
  constructor(config) {
    this.config = config;
    this.state = 'idle';
    this.currentUsernameIndex = 0;
    this.result = null;
    this.conversationLog = [];
  }

  /**
   * Send a message to BotFather via Clawdbot's message tool
   */
  async sendToBotFather(text) {
    const { execSync } = require('child_process');
    
    // Use clawdbot CLI to send message
    // The message tool should be able to target BotFather
    const cmd = `clawdbot message send --target "${BOTFATHER_ID}" --message "${text.replace(/"/g, '\\"')}"`;
    
    try {
      const result = execSync(cmd, { encoding: 'utf-8', timeout: 30000 });
      this.conversationLog.push({ direction: 'out', text, timestamp: new Date().toISOString() });
      console.log(`→ Sent: ${text}`);
      return { success: true, result };
    } catch (error) {
      console.error(`Failed to send: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Poll for BotFather's response
   * This checks recent messages in the BotFather chat
   */
  async waitForResponse(timeoutMs = 10000, pollIntervalMs = 1000) {
    const { execSync } = require('child_process');
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        // Try to get recent messages from BotFather
        // This depends on how Clawdbot exposes incoming messages
        const cmd = `clawdbot message history --target "${BOTFATHER_ID}" --limit 1 2>/dev/null || echo "{}"`;
        const result = execSync(cmd, { encoding: 'utf-8', timeout: 5000 });
        
        if (result && result.trim() !== '{}') {
          const parsed = JSON.parse(result);
          if (parsed.text && !this.conversationLog.find(m => m.text === parsed.text && m.direction === 'in')) {
            this.conversationLog.push({ direction: 'in', text: parsed.text, timestamp: new Date().toISOString() });
            console.log(`← Received: ${parsed.text.substring(0, 100)}...`);
            return { success: true, text: parsed.text };
          }
        }
      } catch (e) {
        // Ignore polling errors
      }
      
      await new Promise(r => setTimeout(r, pollIntervalMs));
    }
    
    return { success: false, error: 'Timeout waiting for response' };
  }

  /**
   * Parse bot token from BotFather's success message
   */
  parseToken(text) {
    // BotFather sends token in format: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz
    const tokenMatch = text.match(/(\d+:[A-Za-z0-9_-]+)/);
    return tokenMatch ? tokenMatch[1] : null;
  }

  /**
   * Run the full bot creation flow
   */
  async createBot() {
    console.log('\n🤖 BotFather Automation Starting...\n');
    console.log(`Bot name: ${this.config.name}`);
    console.log(`Username options: ${this.config.usernames.join(', ')}\n`);

    // Validate usernames end with 'bot'
    for (const username of this.config.usernames) {
      if (!username.toLowerCase().endsWith('bot')) {
        console.error(`❌ Username "${username}" must end with "bot"`);
        return { success: false, error: 'Invalid username format' };
      }
    }

    // Step 1: Send /newbot
    console.log('Step 1: Starting new bot creation...');
    let result = await this.sendToBotFather('/newbot');
    if (!result.success) return result;

    // Wait for "name" prompt
    await new Promise(r => setTimeout(r, 2000));
    
    // Step 2: Send bot name
    console.log('Step 2: Sending bot name...');
    result = await this.sendToBotFather(this.config.name);
    if (!result.success) return result;

    // Wait for "username" prompt
    await new Promise(r => setTimeout(r, 2000));

    // Step 3: Try usernames until one works
    for (let i = 0; i < this.config.usernames.length; i++) {
      const username = this.config.usernames[i];
      console.log(`Step 3.${i + 1}: Trying username @${username}...`);
      
      result = await this.sendToBotFather(username);
      if (!result.success) return result;

      // Wait and check response
      await new Promise(r => setTimeout(r, 3000));
      
      // In a full implementation, we'd parse BotFather's response here
      // to check if username was accepted or rejected
      // For now, we'll try to detect the token in subsequent messages
    }

    console.log('\n✅ Bot creation commands sent!');
    console.log('\nNext steps:');
    console.log('1. Check your BotFather chat for the bot token');
    console.log('2. If username was taken, BotFather will prompt for another');
    console.log('\nConversation log saved to: botfather-log.json');

    // Save conversation log
    fs.writeFileSync(
      path.join(process.cwd(), 'botfather-log.json'),
      JSON.stringify(this.conversationLog, null, 2)
    );

    return { success: true, message: 'Commands sent - check BotFather chat' };
  }
}

/**
 * Alternative approach: Generate instructions for manual execution
 * This is more reliable since BotFather response parsing is tricky
 */
function generateInstructions(config) {
  console.log('\n📋 BotFather Instructions\n');
  console.log('Send these messages to @BotFather in order:\n');
  console.log('1. /newbot');
  console.log(`2. ${config.name}`);
  
  for (let i = 0; i < config.usernames.length; i++) {
    if (i === 0) {
      console.log(`3. ${config.usernames[i]}`);
    } else {
      console.log(`   (if taken, try: ${config.usernames[i]})`);
    }
  }
  
  console.log('\nAfter receiving the token, run:');
  console.log(`  node botfather-create.js --save-token <TOKEN> --username <CHOSEN_USERNAME>\n`);
}

// Main
async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  let config = null;
  let mode = 'auto'; // 'auto' or 'instructions'
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--config' && args[i + 1]) {
      const configPath = args[i + 1];
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      i++;
    } else if (args[i] === '--name' && args[i + 1]) {
      config = config || { usernames: [] };
      config.name = args[i + 1];
      i++;
    } else if (args[i] === '--usernames' && args[i + 1]) {
      config = config || {};
      config.usernames = args[i + 1].split(',').map(u => u.trim());
      i++;
    } else if (args[i] === '--instructions') {
      mode = 'instructions';
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
BotFather Automation Script

Usage:
  node botfather-create.js --name "Bot Name" --usernames "bot1,bot2,bot3"
  node botfather-create.js --config config.json
  node botfather-create.js --config config.json --instructions

Options:
  --name          Bot display name
  --usernames     Comma-separated list of username options (must end with 'bot')
  --config        Path to JSON config file
  --instructions  Just print instructions instead of automating
  --help          Show this help

Config JSON format:
{
  "name": "My Bot",
  "usernames": ["mybot", "my_bot", "mybot_v2"]
}
`);
      process.exit(0);
    }
  }

  if (!config || !config.name || !config.usernames?.length) {
    console.error('❌ Missing required config. Use --help for usage.');
    process.exit(1);
  }

  if (mode === 'instructions') {
    generateInstructions(config);
  } else {
    const automation = new BotFatherAutomation(config);
    const result = await automation.createBot();
    
    if (!result.success) {
      console.error(`\n❌ Failed: ${result.error}`);
      console.log('\nTry running with --instructions flag for manual steps.');
      process.exit(1);
    }
  }
}

main().catch(console.error);
