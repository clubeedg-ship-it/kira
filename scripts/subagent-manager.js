#!/usr/bin/env node
/**
 * Sub-Agent Manager
 * Handles inbox/outbox operations for sub-agent coordination
 */

const fs = require('fs');
const path = require('path');

const INBOX_DIR = path.join(process.env.HOME, 'clawd/inbox');
const OUTBOX_DIR = path.join(process.env.HOME, 'clawd/outbox');
const CONFIG_FILE = path.join(process.env.HOME, 'clawd/subagents.json');

// Ensure directories exist
[INBOX_DIR, OUTBOX_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return { version: 1, projectMappings: {}, activeAgents: [] };
  }
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function generateId(prefix = 'msg') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

// Read all messages from inbox
function readInbox(unreadOnly = false) {
  const files = fs.readdirSync(INBOX_DIR).filter(f => f.endsWith('.json'));
  const messages = files.map(f => {
    const content = JSON.parse(fs.readFileSync(path.join(INBOX_DIR, f), 'utf8'));
    content._file = f;
    return content;
  });
  
  if (unreadOnly) {
    return messages.filter(m => !m.read);
  }
  return messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// Post a message to inbox (sub-agent → main agent)
function postToInbox(message) {
  const msg = {
    id: generateId('msg'),
    timestamp: new Date().toISOString(),
    read: false,
    ...message
  };
  
  const filename = `${msg.id}.json`;
  fs.writeFileSync(path.join(INBOX_DIR, filename), JSON.stringify(msg, null, 2));
  console.log(`📥 Posted to inbox: ${msg.subject || msg.id}`);
  return msg;
}

// Mark inbox message as read
function markRead(messageId) {
  const files = fs.readdirSync(INBOX_DIR).filter(f => f.includes(messageId));
  files.forEach(f => {
    const filepath = path.join(INBOX_DIR, f);
    const msg = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    msg.read = true;
    msg.readAt = new Date().toISOString();
    fs.writeFileSync(filepath, JSON.stringify(msg, null, 2));
  });
}

// Read all tasks from outbox
function readOutbox(agentLabel = null) {
  const files = fs.readdirSync(OUTBOX_DIR).filter(f => f.endsWith('.json'));
  let messages = files.map(f => {
    const content = JSON.parse(fs.readFileSync(path.join(OUTBOX_DIR, f), 'utf8'));
    content._file = f;
    return content;
  });
  
  if (agentLabel) {
    messages = messages.filter(m => m.to === agentLabel);
  }
  return messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// Post a task to outbox (main agent → sub-agent)
function postToOutbox(task) {
  const t = {
    id: generateId('task'),
    timestamp: new Date().toISOString(),
    status: 'pending',
    ...task
  };
  
  const filename = `${t.id}.json`;
  fs.writeFileSync(path.join(OUTBOX_DIR, filename), JSON.stringify(t, null, 2));
  console.log(`📤 Posted to outbox: ${t.subject || t.id} → ${t.to}`);
  return t;
}

// Update outbox task status
function updateTask(taskId, updates) {
  const files = fs.readdirSync(OUTBOX_DIR).filter(f => f.includes(taskId));
  files.forEach(f => {
    const filepath = path.join(OUTBOX_DIR, f);
    const task = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    Object.assign(task, updates, { updatedAt: new Date().toISOString() });
    fs.writeFileSync(filepath, JSON.stringify(task, null, 2));
  });
}

// Get summary for heartbeat/morning report
function getSummary() {
  const inbox = readInbox();
  const outbox = readOutbox();
  const config = loadConfig();
  
  const unread = inbox.filter(m => !m.read);
  const urgent = unread.filter(m => m.priority === 'urgent' || m.requiresResponse);
  const pendingTasks = outbox.filter(t => t.status === 'pending');
  
  return {
    unreadCount: unread.length,
    urgentCount: urgent.length,
    pendingTaskCount: pendingTasks.length,
    activeAgents: config.activeAgents || [],
    urgent,
    recent: inbox.slice(0, 5)
  };
}

// CLI interface
const command = process.argv[2];
const args = process.argv.slice(3);

switch (command) {
  case 'inbox':
    const unreadOnly = args.includes('--unread');
    const messages = readInbox(unreadOnly);
    if (messages.length === 0) {
      console.log('📭 Inbox empty');
    } else {
      console.log(`📬 Inbox (${messages.length} messages):\n`);
      messages.forEach(m => {
        const status = m.read ? '✓' : '●';
        const priority = m.priority === 'urgent' ? '🔴' : m.priority === 'high' ? '🟡' : '';
        console.log(`${status} ${priority} [${m.from}] ${m.subject}`);
        console.log(`   ${m.timestamp} | ${m.type}`);
        if (!m.read) console.log(`   ${m.body?.substring(0, 100)}...`);
        console.log();
      });
    }
    break;
    
  case 'outbox':
    const tasks = readOutbox(args[0]);
    if (tasks.length === 0) {
      console.log('📤 Outbox empty');
    } else {
      console.log(`📤 Outbox (${tasks.length} tasks):\n`);
      tasks.forEach(t => {
        const status = t.status === 'completed' ? '✓' : t.status === 'pending' ? '○' : '⋯';
        console.log(`${status} [→ ${t.to}] ${t.subject}`);
        console.log(`   ${t.timestamp} | ${t.status}`);
        console.log();
      });
    }
    break;
    
  case 'summary':
    const summary = getSummary();
    console.log('📊 Sub-Agent Summary');
    console.log(`   Unread messages: ${summary.unreadCount}`);
    console.log(`   Urgent/needs response: ${summary.urgentCount}`);
    console.log(`   Pending tasks: ${summary.pendingTaskCount}`);
    console.log(`   Active agents: ${summary.activeAgents.length || 'none'}`);
    if (summary.urgent.length > 0) {
      console.log('\n🔴 Urgent:');
      summary.urgent.forEach(m => console.log(`   - [${m.from}] ${m.subject}`));
    }
    break;
    
  case 'post-inbox':
    // Usage: post-inbox --from agent --type progress --subject "..." --body "..."
    const inboxMsg = {};
    for (let i = 0; i < args.length; i += 2) {
      const key = args[i].replace('--', '');
      inboxMsg[key] = args[i + 1];
    }
    postToInbox(inboxMsg);
    break;
    
  case 'post-outbox':
    // Usage: post-outbox --to agent --type task --subject "..." --body "..."
    const outboxTask = {};
    for (let i = 0; i < args.length; i += 2) {
      const key = args[i].replace('--', '');
      outboxTask[key] = args[i + 1];
    }
    postToOutbox(outboxTask);
    break;
    
  case 'mark-read':
    markRead(args[0]);
    console.log(`✓ Marked ${args[0]} as read`);
    break;
    
  default:
    console.log(`
Sub-Agent Manager

Commands:
  inbox [--unread]     List inbox messages
  outbox [agent]       List outbox tasks  
  summary              Get summary for heartbeat
  post-inbox           Post message to inbox
  post-outbox          Post task to outbox
  mark-read <id>       Mark message as read
`);
}

module.exports = {
  readInbox,
  postToInbox,
  markRead,
  readOutbox,
  postToOutbox,
  updateTask,
  getSummary,
  loadConfig,
  saveConfig
};
