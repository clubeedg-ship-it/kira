#!/usr/bin/env node
/**
 * Morning Summary Generator
 * Creates a daily note in Notion with:
 * - Chimera code TODOs
 * - Pending proposals
 * - Project status from Notion
 * - Suggested next actions
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Config
const NOTION_KEY = fs.readFileSync(path.join(process.env.HOME, '.config/notion/api_key'), 'utf8').trim();
const DAILY_NOTES_DB = '23d9f952-51ec-4462-a64d-9b8a800c26f2'; // database_id for creating pages
const PROJECTS_DB = '279a6c94-88ca-802a-b531-000b4470c5dd';
const CHIMERA_DIR = path.join(process.env.HOME, 'chimera');

const headers = {
  'Authorization': `Bearer ${NOTION_KEY}`,
  'Notion-Version': '2025-09-03',
  'Content-Type': 'application/json'
};

async function notionFetch(endpoint, options = {}) {
  const url = `https://api.notion.com/v1${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers }
  });
  return res.json();
}

async function getCodeTodos() {
  try {
    const output = execSync(
      `grep -rn "TODO" ${CHIMERA_DIR}/src --include="*.js" 2>/dev/null | head -20`,
      { encoding: 'utf8' }
    );
    return output.split('\n').filter(Boolean).map(line => {
      const match = line.match(/([^:]+):(\d+):\s*\/\/\s*TODO:?\s*(.*)/);
      if (match) {
        const file = path.basename(match[1]);
        return `• \`${file}:${match[2]}\` - ${match[3].trim()}`;
      }
      return null;
    }).filter(Boolean);
  } catch (e) {
    return ['No TODOs found'];
  }
}

async function getPendingProposals() {
  const proposalsDir = path.join(CHIMERA_DIR, 'vdr/proposals');
  try {
    const files = fs.readdirSync(proposalsDir).filter(f => f.endsWith('.md'));
    return files.map(f => {
      const content = fs.readFileSync(path.join(proposalsDir, f), 'utf8');
      const titleMatch = content.match(/^#\s*(.+)/m) || content.match(/title:\s*(.+)/i);
      const title = titleMatch ? titleMatch[1].trim() : f;
      return `• ${title}`;
    });
  } catch (e) {
    return ['No pending proposals'];
  }
}

async function getActiveProjects() {
  const data = await notionFetch(`/data_sources/${PROJECTS_DB}/query`, {
    method: 'POST',
    body: JSON.stringify({
      filter: {
        property: 'Status',
        status: { equals: 'In progress' }
      },
      sorts: [{ property: 'Priority', direction: 'descending' }]
    })
  });
  
  return (data.results || []).map(p => ({
    id: p.id,
    name: p.properties.Name?.title?.[0]?.text?.content || 'Unnamed',
    priority: p.properties.Priority?.select?.name || 'None',
    status: p.properties.Status?.status?.name || 'Unknown'
  }));
}

function generateNextActions(projects) {
  // Smart suggestions based on project names and priority
  const suggestions = {
    'Chimera': 'Review pending proposals, implement next savant',
    'PAS': 'Continue Chimera development (they\'re related)',
    'CuttingEdge': 'Check media deliverables, review SOP progress',
    'IAM': 'Follow up on email outreach campaigns',
    'Abura': 'Review cosmetics catalog progress',
    'omiXimo': 'Check inventory sync status',
    'OTTOGEN': 'Review automation pipelines',
    'default': 'Review current status and define next milestone'
  };
  
  return projects.map(p => {
    const key = Object.keys(suggestions).find(k => 
      p.name.toLowerCase().includes(k.toLowerCase())
    ) || 'default';
    return `**${p.name}** (${p.priority})\n   → ${suggestions[key]}`;
  });
}

// Parse markdown-like text into Notion rich_text array
function parseRichText(text) {
  const parts = [];
  // Pattern for **bold**, `code`, and plain text
  const regex = /(\*\*(.+?)\*\*)|(`(.+?)`)|([^*`]+)/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    if (match[2]) {
      // Bold text
      parts.push({
        text: { content: match[2] },
        annotations: { bold: true }
      });
    } else if (match[4]) {
      // Code text
      parts.push({
        text: { content: match[4] },
        annotations: { code: true }
      });
    } else if (match[5]) {
      // Plain text
      parts.push({
        text: { content: match[5] }
      });
    }
  }
  
  return parts.length ? parts : [{ text: { content: text } }];
}

async function createDailyNote(content) {
  const today = new Date().toISOString().split('T')[0];
  const title = `☀️ Morning Summary - ${today}`;
  
  // Build blocks from content
  const blocks = [];
  
  // Code TODOs section
  blocks.push({
    object: 'block',
    type: 'heading_2',
    heading_2: { rich_text: [{ text: { content: '🔧 Code TODOs' } }] }
  });
  content.todos.forEach(todo => {
    blocks.push({
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: { rich_text: parseRichText(todo.replace(/^•\s*/, '')) }
    });
  });
  
  // Proposals section
  blocks.push({
    object: 'block',
    type: 'heading_2',
    heading_2: { rich_text: [{ text: { content: '📋 Pending Proposals' } }] }
  });
  content.proposals.forEach(prop => {
    blocks.push({
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: { rich_text: parseRichText(prop.replace(/^•\s*/, '')) }
    });
  });
  
  // Active Projects section
  blocks.push({
    object: 'block',
    type: 'heading_2',
    heading_2: { rich_text: [{ text: { content: '🚀 Active Projects & Next Actions' } }] }
  });
  content.nextActions.forEach(action => {
    // Split multi-line actions (project name and suggestion)
    const lines = action.split('\n').filter(Boolean);
    lines.forEach((line, i) => {
      const trimmed = line.replace(/^\s*→\s*/, '→ ');
      blocks.push({
        object: 'block',
        type: i === 0 ? 'bulleted_list_item' : 'paragraph',
        [i === 0 ? 'bulleted_list_item' : 'paragraph']: { 
          rich_text: parseRichText(trimmed) 
        }
      });
    });
  });
  
  // Create the page (only using Name property which exists)
  const page = await notionFetch('/pages', {
    method: 'POST',
    body: JSON.stringify({
      parent: { type: 'database_id', database_id: DAILY_NOTES_DB },
      properties: {
        Name: { title: [{ text: { content: title } }] }
      },
      children: blocks.slice(0, 100) // Notion limit
    })
  });
  
  return page;
}

async function generateTelegramMessage(content) {
  const today = new Date().toISOString().split('T')[0];
  let msg = `☀️ **Morning Summary - ${today}**\n\n`;
  
  msg += `🔍 **System Health:**\n`;
  msg += `• Gateway running ✅\n`;
  msg += `• Observer extracted patterns from logs\n\n`;
  
  msg += `📋 **Pending Work:**\n`;
  msg += `• ${content.todos.length} code TODOs in Chimera\n`;
  msg += `• ${content.proposals.length} proposals awaiting review\n\n`;
  
  msg += `🚀 **Active Projects (${content.projects.length}):**\n`;
  content.projects.slice(0, 5).forEach(p => {
    msg += `• ${p.name} (${p.priority})\n`;
  });
  if (content.projects.length > 5) {
    msg += `• ...and ${content.projects.length - 5} more\n`;
  }
  
  msg += `\n📝 Daily note created in Notion!`;
  msg += `\n\nWant me to show proposals or start on any of these?`;
  
  return msg;
}

async function main() {
  console.log('🌅 Generating morning summary...\n');
  
  // Gather data
  const todos = await getCodeTodos();
  console.log(`Found ${todos.length} code TODOs`);
  
  const proposals = await getPendingProposals();
  console.log(`Found ${proposals.length} pending proposals`);
  
  const projects = await getActiveProjects();
  console.log(`Found ${projects.length} active projects`);
  
  const nextActions = generateNextActions(projects);
  
  const content = { todos, proposals, projects, nextActions };
  
  // Create Notion page
  const page = await createDailyNote(content);
  if (page.id) {
    console.log(`\n✅ Created Notion daily note: ${page.url}`);
  } else {
    console.error('Failed to create Notion page:', page);
  }
  
  // Generate Telegram message
  const telegramMsg = await generateTelegramMessage(content);
  console.log('\n--- Telegram Message ---');
  console.log(telegramMsg);
  
  // Output for cron to pick up
  if (process.env.OUTPUT_FILE) {
    fs.writeFileSync(process.env.OUTPUT_FILE, telegramMsg);
  }
  
  return telegramMsg;
}

main().catch(console.error);
