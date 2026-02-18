#!/usr/bin/env node
const fs = require('fs');
const API_KEY = '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';
const NOTION_VERSION = '2022-06-28';
const BASE = 'https://api.notion.com/v1';
const log = [];

function logIt(type, name, id) {
  log.push({ type, name, id });
  console.log(`✅ ${type}: ${name} → ${id}`);
}

async function api(method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Notion-Version': NOTION_VERSION, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json();
  if (!r.ok) { console.error(`ERR ${method} ${path}:`, JSON.stringify(d)); throw new Error(d.message); }
  return d;
}

const rt = t => [{ type: 'text', text: { content: t } }];
const ttl = t => ({ title: rt(t) });

async function main() {
  // Find a parent page to nest under (first available)
  const search = await api('POST', '/search', { query: '', filter: { property: 'object', value: 'page' }, page_size: 1 });
  const parentId = search.results[0]?.id;
  
  // Create Command Center
  const cc = await api('POST', '/pages', {
    parent: parentId ? { page_id: parentId } : { workspace: true },
    properties: ttl('🏢 Oopuo Command Center'),
    children: [
      { object: 'block', type: 'heading_1', heading_1: { rich_text: rt('Oopuo Command Center') } },
      { object: 'block', type: 'paragraph', paragraph: { rich_text: rt('Portfolio management for 6 ventures. Vision: $1B valuation by October 2026.') } },
      { object: 'block', type: 'divider', divider: {} },
    ]
  });
  const ccId = cc.id;
  logIt('Page', '🏢 Oopuo Command Center', ccId);

  // Companies DB
  const compDb = await api('POST', '/databases', {
    parent: { page_id: ccId },
    title: rt('🏭 Companies'),
    properties: {
      'Name': { title: {} },
      'Health': { select: { options: [{ name: '🟢 Healthy', color: 'green' }, { name: '🟡 At Risk', color: 'yellow' }, { name: '🔴 Critical', color: 'red' }] } },
      'Key Metric': { rich_text: {} },
      'Current Phase': { select: { options: [{ name: 'Ideation', color: 'gray' }, { name: 'Validation', color: 'blue' }, { name: 'Building', color: 'purple' }, { name: 'Growth', color: 'green' }, { name: 'Scale', color: 'orange' }] } },
      'Description': { rich_text: {} },
    }
  });
  logIt('Database', '🏭 Companies', compDb.id);

  // Goal Cascade DB (without self-relation initially)
  const goalDb = await api('POST', '/databases', {
    parent: { page_id: ccId },
    title: rt('🎯 Goal Cascade'),
    properties: {
      'Goal': { title: {} },
      'Level': { select: { options: [
        { name: '🌟 Vision', color: 'red' }, { name: '📅 6-Month Goal', color: 'orange' },
        { name: '🎯 3-Month Objective', color: 'yellow' }, { name: '📋 1-Month Target', color: 'green' },
        { name: '🏃 Weekly Sprint', color: 'blue' }, { name: '✅ Daily Task', color: 'gray' },
      ] } },
      'Status': { select: { options: [
        { name: 'Not Started', color: 'gray' }, { name: 'In Progress', color: 'blue' },
        { name: 'On Track', color: 'green' }, { name: 'At Risk', color: 'yellow' },
        { name: 'Blocked', color: 'red' }, { name: 'Done', color: 'green' },
      ] } },
      'Progress %': { number: { format: 'percent' } },
      'Due Date': { date: {} },
      'Owner': { select: { options: [{ name: 'Otto', color: 'blue' }, { name: 'Kira', color: 'purple' }] } },
      'Why This Matters': { rich_text: {} },
      'Company': { relation: { database_id: compDb.id, single_property: {} } },
    }
  });
  logIt('Database', '🎯 Goal Cascade', goalDb.id);

  // Add self-relation
  await api('PATCH', `/databases/${goalDb.id}`, {
    properties: { 'Parent Goal': { relation: { database_id: goalDb.id, single_property: {} } } }
  });
  console.log('✅ Self-relation added to Goals');

  // Tasks DB
  const taskDb = await api('POST', '/databases', {
    parent: { page_id: ccId },
    title: rt('📋 Tasks'),
    properties: {
      'Task': { title: {} },
      'Company': { relation: { database_id: compDb.id, single_property: {} } },
      'Goal': { relation: { database_id: goalDb.id, single_property: {} } },
      'Sprint Week': { rich_text: {} },
      'Status': { select: { options: [
        { name: 'Backlog', color: 'gray' }, { name: 'Todo', color: 'blue' },
        { name: 'In Progress', color: 'yellow' }, { name: 'Done', color: 'green' }, { name: 'Blocked', color: 'red' },
      ] } },
      'Priority': { select: { options: [
        { name: 'P0', color: 'red' }, { name: 'P1', color: 'orange' },
        { name: 'P2', color: 'yellow' }, { name: 'P3', color: 'gray' },
      ] } },
      'Assignee': { select: { options: [{ name: 'Otto', color: 'blue' }, { name: 'Kira', color: 'purple' }] } },
      'Due Date': { date: {} },
      'Effort': { select: { options: [{ name: 'S', color: 'green' }, { name: 'M', color: 'yellow' }, { name: 'L', color: 'red' }] } },
      'BuJo Signifier': { select: { options: [
        { name: '• Task', color: 'gray' }, { name: '× Done', color: 'green' },
        { name: '> Migrated', color: 'blue' }, { name: '○ Event', color: 'yellow' }, { name: '— Note', color: 'default' },
      ] } },
    }
  });
  logIt('Database', '📋 Tasks', taskDb.id);

  // Add Blocked By self-relation
  await api('PATCH', `/databases/${taskDb.id}`, {
    properties: { 'Blocked By': { relation: { database_id: taskDb.id, single_property: {} } } }
  });
  console.log('✅ Self-relation added to Tasks');

  // Seed companies
  const companies = [
    ['IAM (Interactive Move)', 'Interactive floor/wall projectors for kindergartens', '🟢 Healthy', 'Growth', '20+ kindergarten clients target'],
    ['ZenithCred', 'Corporate wellness gamification (light panels + biofeedback)', '🟡 At Risk', 'Validation', '€1.1M seed round'],
    ['OttoGen', "Otto's personal brand + AI services for SMBs", '🟡 At Risk', 'Building', '€5K MRR'],
    ['CuttingEdge', 'Interior design & rebuilding PM', '🟢 Healthy', 'Growth', 'Stable revenue stream'],
    ['SentinAgro', 'Drone cattle monitoring (future)', '🟡 At Risk', 'Ideation', 'Feasibility study complete'],
    ['Chimera', 'Privacy-preserving distributed AI', '🟡 At Risk', 'Building', 'MVP with 10 test nodes'],
  ];
  const compIds = {};
  for (const [name, desc, health, phase, metric] of companies) {
    const p = await api('POST', '/pages', {
      parent: { database_id: compDb.id },
      properties: {
        'Name': ttl(name), 'Health': { select: { name: health } },
        'Key Metric': { rich_text: rt(metric) }, 'Current Phase': { select: { name: phase } },
        'Description': { rich_text: rt(desc) },
      }
    });
    compIds[name] = p.id;
    logIt('Company', name, p.id);
  }

  // Seed Vision
  const vision = await api('POST', '/pages', {
    parent: { database_id: goalDb.id },
    properties: {
      'Goal': ttl('$1B Oopuo valuation by October 2026'),
      'Level': { select: { name: '🌟 Vision' } },
      'Status': { select: { name: 'In Progress' } },
      'Progress %': { number: 0.05 },
      'Due Date': { date: { start: '2026-10-01' } },
      'Owner': { select: { name: 'Otto' } },
      'Why This Matters': { rich_text: rt('The north star. Build a portfolio of 6 ventures worth $1B together.') },
    }
  });
  logIt('Goal (Vision)', '$1B Oopuo valuation by October 2026', vision.id);

  // Seed 6-month goals
  const goals = [
    ['Close seed round €1.1M', 'ZenithCred', 'Funding unlocks product dev and enterprise pilots'],
    ['Reach profitability, 20+ kindergarten clients', 'IAM (Interactive Move)', 'IAM as cash cow funds other ventures'],
    ['Launch brand, €5K MRR from AI services', 'OttoGen', 'Personal brand drives deal flow; AI services = recurring revenue'],
    ['Stable revenue stream', 'CuttingEdge', 'Reliable cash flow supports portfolio operations'],
    ['Complete feasibility research', 'SentinAgro', 'Validate market before committing capital'],
    ['Working MVP with 10 test nodes', 'Chimera', 'Prove distributed AI concept; foundation for fundraise'],
  ];
  for (const [goal, comp, why] of goals) {
    const p = await api('POST', '/pages', {
      parent: { database_id: goalDb.id },
      properties: {
        'Goal': ttl(goal),
        'Level': { select: { name: '📅 6-Month Goal' } },
        'Status': { select: { name: 'Not Started' } },
        'Progress %': { number: 0 },
        'Due Date': { date: { start: '2026-08-01' } },
        'Owner': { select: { name: 'Otto' } },
        'Why This Matters': { rich_text: rt(why) },
        'Company': { relation: [{ id: compIds[comp] }] },
        'Parent Goal': { relation: [{ id: vision.id }] },
      }
    });
    logIt('Goal (6-Month)', `${comp}: ${goal}`, p.id);
  }

  // CEO Dashboard
  const dash = await api('POST', '/pages', {
    parent: { page_id: ccId },
    properties: ttl('📊 CEO Dashboard'),
    children: [
      { object: 'block', type: 'heading_1', heading_1: { rich_text: rt('📊 CEO Dashboard — Portfolio Health') } },
      { object: 'block', type: 'callout', callout: { rich_text: rt('Vision: $1B Oopuo valuation by October 2026'), icon: { emoji: '🎯' } } },
      { object: 'block', type: 'divider', divider: {} },
      { object: 'block', type: 'heading_2', heading_2: { rich_text: rt('🏭 Company Health') } },
      { object: 'block', type: 'link_to_page', link_to_page: { database_id: compDb.id } },
      { object: 'block', type: 'divider', divider: {} },
      { object: 'block', type: 'heading_2', heading_2: { rich_text: rt('🎯 Goal Progress') } },
      { object: 'block', type: 'link_to_page', link_to_page: { database_id: goalDb.id } },
      { object: 'block', type: 'divider', divider: {} },
      { object: 'block', type: 'heading_2', heading_2: { rich_text: rt('📋 This Week\'s Tasks') } },
      { object: 'block', type: 'link_to_page', link_to_page: { database_id: taskDb.id } },
      { object: 'block', type: 'divider', divider: {} },
      { object: 'block', type: 'heading_2', heading_2: { rich_text: rt('🚨 Active Blockers') } },
      { object: 'block', type: 'paragraph', paragraph: { rich_text: rt('Filter Tasks by Status=Blocked and Goals by Status=Blocked to see all active blockers.') } },
    ]
  });
  logIt('Page', '📊 CEO Dashboard', dash.id);

  // Save log
  let md = `# Notion PM Setup Log\n\n**Created:** ${new Date().toISOString()}\n\n## Resources Created\n\n| Type | Name | Notion ID |\n|------|------|-----------|\n`;
  for (const e of log) md += `| ${e.type} | ${e.name} | \`${e.id}\` |\n`;
  md += `\n## Database IDs (for API use)\n\n- **Companies DB:** \`${compDb.id}\`\n- **Goal Cascade DB:** \`${goalDb.id}\`\n- **Tasks DB:** \`${taskDb.id}\`\n- **Command Center Page:** \`${ccId}\`\n- **CEO Dashboard:** \`${dash.id}\`\n`;
  fs.writeFileSync('/home/adminuser/kira/vdr/notion-pm-setup-log.md', md);
  console.log('\n🎉 All done! Log saved.');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
