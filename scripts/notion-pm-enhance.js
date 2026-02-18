#!/usr/bin/env node
const fs = require('fs');
const API_KEY = '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';
const VER = '2022-06-28';
const BASE = 'https://api.notion.com/v1';
const log = [];

function logIt(type, name, id) { log.push({ type, name, id }); console.log(`✅ ${type}: ${name} → ${id}`); }

async function api(method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Notion-Version': VER, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json();
  if (!r.ok) { console.error(`ERR ${method} ${path}:`, JSON.stringify(d, null, 2)); throw new Error(d.message); }
  return d;
}

const rt = t => [{ type: 'text', text: { content: t } }];
const ttl = t => ({ title: rt(t) });

// Actual IDs from the integration's accessible databases
const DB = {
  goals: '2fba6c94-88ca-8102-afb2-cae874f281bd',
  projects: '279a6c94-88ca-80c0-8c02-cdf4f2ffd96c',
  tasks: '8b9243d7-0f29-4507-9000-d6f36362827b',
  daily: '23d9f952-51ec-4462-a64d-9b8a800c26f2',
  monthly: '2fba6c94-88ca-81e0-938e-ceb20fcc7203',
  areas: '279a6c94-88ca-8073-9f0d-cdac4455b4c3',
};

async function main() {
  // 1. Inspect existing DBs
  console.log('--- Inspecting existing databases ---');
  const goalsDb = await api('GET', `/databases/${DB.goals}`);
  const goalProps = Object.keys(goalsDb.properties);
  console.log('Goals props:', goalProps.join(', '));
  const goalTitleProp = Object.entries(goalsDb.properties).find(([k,v]) => v.type === 'title')?.[0] || 'Name';
  console.log('Goals title prop:', goalTitleProp);

  const tasksDb = await api('GET', `/databases/${DB.tasks}`);
  const taskProps = Object.keys(tasksDb.properties);
  console.log('Tasks props:', taskProps.join(', '));

  // Find parent for new pages
  const goalsParent = goalsDb.parent;
  console.log('Goals parent:', JSON.stringify(goalsParent));
  const parentSpec = goalsParent.type === 'page_id' 
    ? { page_id: goalsParent.page_id }
    : goalsParent.type === 'block_id' ? { page_id: goalsParent.block_id }
    : { workspace: true };

  // 2. Check if Companies DB already exists (from prior run)
  // Use the first one created from our earlier run, or create new
  let compDbId;
  // The earlier run created '300a6c94-88ca-8143-8ada-e3fc640db447' - let's check if it has data
  const existingComp = await api('POST', `/databases/300a6c94-88ca-8143-8ada-e3fc640db447/query`, { page_size: 1 }).catch(() => null);
  if (existingComp && existingComp.results.length > 0) {
    console.log('Using existing Companies DB from prior run');
    compDbId = '300a6c94-88ca-8143-8ada-e3fc640db447';
    logIt('Database (REUSED)', '🏭 Companies', compDbId);
  } else {
    // Create fresh under same parent as goals
    console.log('\n--- Creating Companies DB ---');
    const compDb = await api('POST', '/databases', {
      parent: parentSpec,
      title: rt('🏭 Companies'),
      properties: {
        'Name': { title: {} },
        'Health': { select: { options: [{ name: '🟢 Healthy', color: 'green' }, { name: '🟡 At Risk', color: 'yellow' }, { name: '🔴 Critical', color: 'red' }] } },
        'Key Metric': { rich_text: {} },
        'Current Phase': { select: { options: [{ name: 'Ideation', color: 'gray' }, { name: 'Validation', color: 'blue' }, { name: 'Building', color: 'purple' }, { name: 'Growth', color: 'green' }, { name: 'Scale', color: 'orange' }] } },
        'Description': { rich_text: {} },
      }
    });
    compDbId = compDb.id;
    logIt('Database (NEW)', '🏭 Companies', compDbId);
  }

  // 3. Enhance Goals DB
  console.log('\n--- Enhancing Goals DB ---');
  const goalUpdates = {};
  if (!goalProps.includes('Level')) {
    goalUpdates['Level'] = { select: { options: [
      { name: '🌟 Vision', color: 'red' }, { name: '📅 6-Month Goal', color: 'orange' },
      { name: '🎯 3-Month Objective', color: 'yellow' }, { name: '📋 1-Month Target', color: 'green' },
      { name: '🏃 Weekly Sprint', color: 'blue' }, { name: '✅ Daily Task', color: 'gray' },
    ] } };
  }
  if (!goalProps.includes('Company')) {
    goalUpdates['Company'] = { relation: { database_id: compDbId, single_property: {} } };
  }
  if (!goalProps.includes('Owner')) {
    goalUpdates['Owner'] = { select: { options: [{ name: 'Otto', color: 'blue' }, { name: 'Kira', color: 'purple' }] } };
  }
  if (!goalProps.includes('Why This Matters')) {
    goalUpdates['Why This Matters'] = { rich_text: {} };
  }
  if (!goalProps.includes('Due Date')) {
    goalUpdates['Due Date'] = { date: {} };
  }
  if (Object.keys(goalUpdates).length > 0) {
    await api('PATCH', `/databases/${DB.goals}`, { properties: goalUpdates });
    logIt('Enhanced', `Goals DB — added: ${Object.keys(goalUpdates).join(', ')}`, DB.goals);
  } else {
    console.log('Goals DB already has all needed properties');
  }

  if (!goalProps.includes('Parent Goal')) {
    await api('PATCH', `/databases/${DB.goals}`, {
      properties: { 'Parent Goal': { relation: { database_id: DB.goals, single_property: {} } } }
    });
    logIt('Enhanced', 'Goals DB — added Parent Goal self-relation', DB.goals);
  }

  // 4. Enhance Agent Task Tracker
  console.log('\n--- Enhancing Agent Task Tracker ---');
  const taskUpdates = {};
  if (!taskProps.includes('Company')) {
    taskUpdates['Company'] = { relation: { database_id: compDbId, single_property: {} } };
  }
  if (!taskProps.includes('Goal')) {
    taskUpdates['Goal'] = { relation: { database_id: DB.goals, single_property: {} } };
  }
  if (!taskProps.includes('Due Date')) {
    taskUpdates['Due Date'] = { date: {} };
  }
  if (!taskProps.includes('Effort')) {
    taskUpdates['Effort'] = { select: { options: [{ name: 'S', color: 'green' }, { name: 'M', color: 'yellow' }, { name: 'L', color: 'red' }] } };
  }
  if (!taskProps.includes('BuJo Signifier')) {
    taskUpdates['BuJo Signifier'] = { select: { options: [
      { name: '• Task', color: 'gray' }, { name: '× Done', color: 'green' },
      { name: '> Migrated', color: 'blue' }, { name: '○ Event', color: 'yellow' }, { name: '— Note', color: 'default' },
    ] } };
  }
  if (Object.keys(taskUpdates).length > 0) {
    await api('PATCH', `/databases/${DB.tasks}`, { properties: taskUpdates });
    logIt('Enhanced', `Task Tracker — added: ${Object.keys(taskUpdates).join(', ')}`, DB.tasks);
  } else {
    console.log('Task Tracker already has all needed properties');
  }

  if (!taskProps.includes('Blocked By')) {
    await api('PATCH', `/databases/${DB.tasks}`, {
      properties: { 'Blocked By': { relation: { database_id: DB.tasks, single_property: {} } } }
    });
    logIt('Enhanced', 'Task Tracker — added Blocked By self-relation', DB.tasks);
  }

  // 5. Seed Companies (check if already seeded)
  const existingCompanies = await api('POST', `/databases/${compDbId}/query`, { page_size: 10 });
  let compIds = {};
  if (existingCompanies.results.length >= 6) {
    console.log('\n--- Companies already seeded, collecting IDs ---');
    for (const r of existingCompanies.results) {
      const name = r.properties.Name?.title?.[0]?.plain_text;
      if (name) { compIds[name] = r.id; logIt('Company (existing)', name, r.id); }
    }
  } else {
    console.log('\n--- Seeding Companies ---');
    const companies = [
      ['IAM (Interactive Move)', 'Interactive floor/wall projectors for kindergartens', '🟢 Healthy', 'Growth', '20+ kindergarten clients target'],
      ['ZenithCred', 'Corporate wellness gamification (light panels + biofeedback)', '🟡 At Risk', 'Validation', '€1.1M seed round'],
      ['OttoGen', "Otto's personal brand + AI services for SMBs", '🟡 At Risk', 'Building', '€5K MRR'],
      ['CuttingEdge', 'Interior design & rebuilding PM', '🟢 Healthy', 'Growth', 'Stable revenue stream'],
      ['SentinAgro', 'Drone cattle monitoring (future)', '🟡 At Risk', 'Ideation', 'Feasibility study complete'],
      ['Chimera', 'Privacy-preserving distributed AI', '🟡 At Risk', 'Building', 'MVP with 10 test nodes'],
    ];
    for (const [name, desc, health, phase, metric] of companies) {
      const p = await api('POST', '/pages', {
        parent: { database_id: compDbId },
        properties: {
          'Name': ttl(name), 'Health': { select: { name: health } },
          'Key Metric': { rich_text: rt(metric) }, 'Current Phase': { select: { name: phase } },
          'Description': { rich_text: rt(desc) },
        }
      });
      compIds[name] = p.id;
      logIt('Company', name, p.id);
    }
  }

  // 6. Seed Goal Cascade
  console.log('\n--- Seeding Goal Cascade ---');
  // Check if vision already exists
  const existingGoals = await api('POST', `/databases/${DB.goals}/query`, {
    filter: { property: 'Level', select: { equals: '🌟 Vision' } }, page_size: 1
  }).catch(() => ({ results: [] }));

  let visionId;
  if (existingGoals.results.length > 0) {
    visionId = existingGoals.results[0].id;
    console.log('Vision goal already exists:', visionId);
    logIt('Goal (existing)', 'Vision', visionId);
  } else {
    const vision = await api('POST', '/pages', {
      parent: { database_id: DB.goals },
      properties: {
        [goalTitleProp]: ttl('$1B Oopuo valuation by October 2026'),
        'Level': { select: { name: '🌟 Vision' } },
        'Status': { select: { name: 'In Progress' } },
        'Due Date': { date: { start: '2026-10-01' } },
        'Owner': { select: { name: 'Otto' } },
        'Why This Matters': { rich_text: rt('The north star. Build a portfolio of 6 ventures worth $1B together.') },
      }
    });
    visionId = vision.id;
    logIt('Goal (Vision)', '$1B Oopuo valuation by October 2026', visionId);
  }

  // Check if 6-month goals exist
  const existing6m = await api('POST', `/databases/${DB.goals}/query`, {
    filter: { property: 'Level', select: { equals: '📅 6-Month Goal' } }, page_size: 10
  }).catch(() => ({ results: [] }));

  if (existing6m.results.length >= 6) {
    console.log('6-month goals already seeded');
  } else {
    const goals = [
      ['Close seed round €1.1M', 'ZenithCred', 'Funding unlocks product dev and enterprise pilots'],
      ['Reach profitability, 20+ kindergarten clients', 'IAM (Interactive Move)', 'IAM as cash cow funds other ventures'],
      ['Launch brand, €5K MRR from AI services', 'OttoGen', 'Personal brand drives deal flow; recurring revenue'],
      ['Stable revenue stream', 'CuttingEdge', 'Reliable cash flow supports portfolio operations'],
      ['Complete feasibility research', 'SentinAgro', 'Validate market before committing capital'],
      ['Working MVP with 10 test nodes', 'Chimera', 'Prove distributed AI concept; foundation for fundraise'],
    ];
    for (const [goal, comp, why] of goals) {
      const p = await api('POST', '/pages', {
        parent: { database_id: DB.goals },
        properties: {
          [goalTitleProp]: ttl(goal),
          'Level': { select: { name: '📅 6-Month Goal' } },
          'Status': { select: { name: 'Not Started' } },
          'Due Date': { date: { start: '2026-08-01' } },
          'Owner': { select: { name: 'Otto' } },
          'Why This Matters': { rich_text: rt(why) },
          'Company': { relation: [{ id: compIds[comp] }] },
          'Parent Goal': { relation: [{ id: visionId }] },
        }
      });
      logIt('Goal (6-Month)', `${comp}: ${goal}`, p.id);
    }
  }

  // 7. CEO Dashboard
  console.log('\n--- Creating CEO Dashboard ---');
  const dash = await api('POST', '/pages', {
    parent: parentSpec,
    properties: ttl('📊 CEO Dashboard'),
    children: [
      { object: 'block', type: 'heading_1', heading_1: { rich_text: rt('📊 CEO Dashboard — Portfolio Health') } },
      { object: 'block', type: 'callout', callout: { rich_text: rt('Vision: $1B Oopuo valuation by October 2026'), icon: { emoji: '🎯' } } },
      { object: 'block', type: 'divider', divider: {} },
      { object: 'block', type: 'heading_2', heading_2: { rich_text: rt('🏭 Company Health') } },
      { object: 'block', type: 'link_to_page', link_to_page: { database_id: compDbId } },
      { object: 'block', type: 'divider', divider: {} },
      { object: 'block', type: 'heading_2', heading_2: { rich_text: rt('🎯 Goal Progress') } },
      { object: 'block', type: 'link_to_page', link_to_page: { database_id: DB.goals } },
      { object: 'block', type: 'divider', divider: {} },
      { object: 'block', type: 'heading_2', heading_2: { rich_text: rt('📋 Active Tasks') } },
      { object: 'block', type: 'link_to_page', link_to_page: { database_id: DB.tasks } },
      { object: 'block', type: 'divider', divider: {} },
      { object: 'block', type: 'heading_2', heading_2: { rich_text: rt('🚨 Active Blockers') } },
      { object: 'block', type: 'paragraph', paragraph: { rich_text: rt('Filter Tasks by Status=Blocked and Goals by Status=Blocked.') } },
    ]
  });
  logIt('Page (NEW)', '📊 CEO Dashboard', dash.id);

  // Save log
  let md = `# Notion PM Enhancement Log\n\n**Date:** ${new Date().toISOString()}\n\n## Summary\n\nEnhanced existing Notion databases for Oopuo Project Management.\n- Enhanced Goals DB with cascade properties (Level, Parent Goal, Company, Owner, Why This Matters)\n- Enhanced Agent Task Tracker with PM properties (Company, Goal, Due Date, Effort, BuJo Signifier, Blocked By)\n- Created Companies DB with 6 ventures\n- Seeded Vision + 6-month goals in existing Goals DB\n- Created CEO Dashboard page\n\n## All Changes\n\n| Type | Name | ID |\n|------|------|-----------|\n`;
  for (const e of log) md += `| ${e.type} | ${e.name} | \`${e.id}\` |\n`;
  md += `\n## Database IDs\n\n`;
  md += `- **Companies DB (new):** \`${compDbId}\`\n`;
  md += `- **Goals DB (enhanced):** \`${DB.goals}\`\n`;
  md += `- **Task Tracker (enhanced):** \`${DB.tasks}\`\n`;
  md += `- **Projects DB:** \`${DB.projects}\`\n`;
  md += `- **Daily Notes DB:** \`${DB.daily}\`\n`;
  md += `- **Monthly Goals DB:** \`${DB.monthly}\`\n`;
  md += `- **Areas DB:** \`${DB.areas}\`\n`;
  md += `- **CEO Dashboard:** \`${dash.id}\`\n`;
  fs.writeFileSync('/home/adminuser/kira/vdr/notion-pm-setup-log.md', md);
  console.log('\n🎉 All done! Log saved to vdr/notion-pm-setup-log.md');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
