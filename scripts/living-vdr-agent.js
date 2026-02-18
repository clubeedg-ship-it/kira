#!/usr/bin/env node
/**
 * Living VDR Agent
 * Watches ~/kira/vdr/ for new/changed files, syncs to Notion, extracts tasks.
 * 
 * Cron schedule (recommended): 0 0,4,8,12,16,20 * * * node ~/kira/scripts/living-vdr-agent.js
 * 
 * What it does:
 * 1. Scans all .md files in ~/kira/vdr/
 * 2. Compares mtimes against saved state to find changes
 * 3. Extracts actionable items (TODOs, action items, next steps, recommendations)
 * 4. Creates tasks in Notion Tasks DB (deduplicates by name)
 * 5. Updates state file
 */

const fs = require('fs');
const path = require('path');

const VDR_DIR = path.join(process.env.HOME, 'kira/vdr');
const STATE_PATH = path.join(process.env.HOME, 'kira/scripts/.living-vdr-state.json');
const API_KEY = fs.readFileSync(path.join(process.env.HOME, '.config/notion/api_key'), 'utf8').trim();
const NOTION_VERSION = '2022-06-28';
const TASKS_DB = '300a6c94-88ca-81c7-be95-e0f0433b6f58';

const COMPANY_MAP = {
  ottogen: { name: 'OttoGen', id: '302a6c94-88ca-8177-898e-fa83fdd51585' },
  iam: { name: 'IAM', id: '302a6c94-88ca-81bd-bdb5-dc149ea408c9' },
  zenithcred: { name: 'ZenithCred', id: '302a6c94-88ca-8139-9f24-cbf8c44644b4' },
  sentinagro: { name: 'SentinAgro', id: '302a6c94-88ca-81dc-bfe3-f96a6b54330b' },
  cuttingedge: { name: 'CuttingEdge', id: '302a6c94-88ca-814f-8fc7-e1b8793b660f' },
  abura: { name: 'Abura Cosmetics', id: '302a6c94-88ca-816d-b9c2-cfb8e30ada74' },
  chimera: { name: 'Chimera Protocol', id: '302a6c94-88ca-8117-922e-e001eca14691' },
  oopuo: { name: 'Oopuo', id: '302a6c94-88ca-81ae-9c7e-c6ea8602c8c2' },
};

const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Notion-Version': NOTION_VERSION,
  'Content-Type': 'application/json',
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function notion(url, method = 'GET', body = null) {
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  for (let i = 0; i < 3; i++) {
    const res = await fetch(url, opts);
    if (res.status === 429) { await sleep(2000); continue; }
    const data = await res.json();
    if (!res.ok && res.status >= 500) { await sleep(1000); continue; }
    if (!res.ok) throw new Error(`Notion ${res.status}: ${JSON.stringify(data)}`);
    await sleep(350);
    return data;
  }
}

function findFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findFiles(full));
    else if (entry.name.endsWith('.md')) results.push(full);
  }
  return results;
}

function detectCompany(filePath) {
  const rel = path.relative(VDR_DIR, filePath);
  const folder = rel.split(path.sep)[0]?.toLowerCase();
  return COMPANY_MAP[folder] || null;
}

function extractActions(content, filename) {
  const actions = [];
  const lines = content.split('\n');
  // Patterns for actionable items
  const patterns = [
    /^[-*]\s*\[[ ]\]\s+(.+)/i,           // - [ ] unchecked checkbox
    /(?:TODO|FIXME|ACTION|NEXT STEP)[:\s]+(.+)/i,
    /^[-*]\s+(?:Action|Next step|Recommendation|To-do)[:\s]+(.+)/i,
  ];
  
  // Also look for sections titled "Next Steps", "Action Items", "Recommendations", "TODOs"
  let inActionSection = false;
  for (const line of lines) {
    if (/^#{1,4}\s+(?:next steps?|action items?|recommendations?|to-?dos?|tasks?)/i.test(line)) {
      inActionSection = true;
      continue;
    }
    if (inActionSection && /^#{1,4}\s+/.test(line)) {
      inActionSection = false;
      continue;
    }
    
    for (const pat of patterns) {
      const m = line.match(pat);
      if (m) { actions.push(m[1].trim()); break; }
    }
    
    if (inActionSection && /^[-*]\s+(.{10,})/.test(line)) {
      const m = line.match(/^[-*]\s+(.+)/);
      if (m && !actions.includes(m[1].trim())) actions.push(m[1].trim());
    }
  }
  
  return [...new Set(actions)].slice(0, 10); // Cap at 10 per file
}

async function getExistingTaskNames() {
  const names = new Set();
  let cursor;
  do {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const res = await notion(`https://api.notion.com/v1/databases/${TASKS_DB}/query`, 'POST', body);
    for (const page of res.results) {
      const title = page.properties.Name?.title?.[0]?.plain_text;
      if (title) names.add(title.toLowerCase());
    }
    cursor = res.has_more ? res.next_cursor : null;
  } while (cursor);
  return names;
}

async function createTask(name, { assignee, priority, company, dueDate, notes } = {}) {
  const properties = {
    Name: { title: [{ text: { content: name } }] },
  };
  if (assignee) properties.Assignee = { select: { name: assignee } };
  if (priority) properties.Priority = { select: { name: priority } };
  if (company) properties.Company = { relation: [{ id: company }] };
  if (dueDate) properties['Due Date'] = { date: { start: dueDate } };
  if (notes) properties.Notes = { rich_text: [{ text: { content: notes.slice(0, 2000) } }] };
  
  return notion('https://api.notion.com/v1/pages', 'POST', {
    parent: { database_id: TASKS_DB },
    properties,
  });
}

async function main() {
  console.log('🔍 Living VDR Agent starting...');
  
  // Load state
  let state = {};
  try { state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')); } catch {}
  
  // Find all VDR files
  const files = findFiles(VDR_DIR);
  console.log(`📁 Found ${files.length} VDR files`);
  
  // Find changed files
  const changed = [];
  const newState = {};
  for (const f of files) {
    const mtime = fs.statSync(f).mtimeMs;
    const rel = path.relative(VDR_DIR, f);
    newState[rel] = mtime;
    if (!state[rel] || state[rel] < mtime) changed.push(f);
  }
  
  console.log(`📝 ${changed.length} new/changed files`);
  if (changed.length === 0) {
    console.log('✅ Nothing to process');
    fs.writeFileSync(STATE_PATH, JSON.stringify(newState, null, 2));
    return;
  }
  
  // Get existing tasks for dedup
  console.log('📋 Fetching existing tasks...');
  const existingTasks = await getExistingTaskNames();
  console.log(`   ${existingTasks.size} existing tasks`);
  
  let created = 0;
  const MAX_TASKS_PER_RUN = 50;
  
  for (const filePath of changed) {
    if (created >= MAX_TASKS_PER_RUN) {
      console.log(`\n⚠️  Hit task limit (${MAX_TASKS_PER_RUN}), remaining files next run`);
      break;
    }
    
    const rel = path.relative(VDR_DIR, filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const company = detectCompany(filePath);
    const actions = extractActions(content, rel);
    
    if (actions.length > 0) {
      console.log(`\n📄 ${rel} → ${actions.length} action(s)`);
    }
    
    for (const action of actions) {
      if (created >= MAX_TASKS_PER_RUN) break;
      const taskName = action.length > 80 ? action.slice(0, 77) + '...' : action;
      if (existingTasks.has(taskName.toLowerCase())) continue;
      
      try {
        await createTask(taskName, {
          assignee: 'Kira',
          priority: 'Medium',
          company: company?.id,
          notes: `Source: ${rel}`,
        });
        existingTasks.add(taskName.toLowerCase());
        created++;
        console.log(`   ✅ "${taskName}"`);
      } catch (e) {
        console.log(`   ❌ "${taskName}": ${e.message}`);
      }
    }
    
    // Save state incrementally per file
    state[rel] = newState[rel];
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  }
  
  // Final state save
  fs.writeFileSync(STATE_PATH, JSON.stringify(newState, null, 2));
  console.log(`\n🎉 Done! Created ${created} tasks from VDR documents.`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
