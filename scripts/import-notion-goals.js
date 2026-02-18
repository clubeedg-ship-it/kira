const http = require('http');
const https = require('https');

const NOTION_KEY = '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';
const NOTION_DB = '2fba6c94-88ca-8102-afb2-cae874f281bd';
const BASE = 'http://localhost:3847';

function notionReq(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'api.notion.com', path, method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch(e) { reject(d); }
      });
    });
    req.on('error', reject);
    req.write(data); req.end();
  });
}

function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (global.TOKEN) headers['Authorization'] = `Bearer ${global.TOKEN}`;
    const req = http.request({
      hostname: url.hostname, port: url.port, path: url.pathname + url.search,
      method, headers
    }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch(e) { resolve(d); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

const LEVEL_MAP = {
  '🌟 Vision': 'vision',
  '📅 6-Month Goal': '6month',
  '🗓️ 3-Month Objective': 'quarter',
  '📋 1-Month Target': 'month',
  '🏃 Weekly Sprint': 'week'
};
const CADENCE_MAP = { vision: 'yearly', '6month': 'quarterly', quarter: 'quarterly', month: 'monthly', week: 'weekly' };

function extractGoal(page) {
  const p = page.properties;
  const titleArr = p['Goal']?.title || [];
  let title = titleArr.map(t => t.plain_text).join('');
  // Strip emoji prefixes
  title = title.replace(/^[🌟📅🗓️📋🏃]\s*/u, '').trim();
  
  const levelSelect = p['Level']?.select?.name || '';
  const level = LEVEL_MAP[levelSelect] || 'quarter';
  const progress = (p['Progress']?.number || 0) * 100;
  const dueDate = p['Due Date']?.date?.start || null;
  const keyResults = (p['Key Results']?.rich_text || []).map(t => t.plain_text).join('');
  const parentGoals = (p['Parent Goal']?.relation || []).map(r => r.id);
  const companies = (p['Company']?.relation || []).map(r => r.id);
  const status = p['Status']?.status?.name || '';
  const timeframe = p['Timeframe']?.select?.name || '';

  return {
    notionId: page.id,
    title, level, progress, dueDate, keyResults,
    parentNotionIds: parentGoals,
    companyIds: companies,
    cadence: CADENCE_MAP[level] || 'quarterly',
    status, timeframe
  };
}

async function fetchAllGoals() {
  let all = [], cursor = undefined, hasMore = true;
  while (hasMore) {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const res = await notionReq(`/v1/databases/${NOTION_DB}/query`, body);
    if (res.results) all = all.concat(res.results);
    hasMore = res.has_more;
    cursor = res.next_cursor;
    console.log(`Fetched ${all.length} goals so far...`);
  }
  return all;
}

async function main() {
  // Auth
  const auth = require('/home/adminuser/kira/dashboard/auth.js');
  const loginResult = await auth.login('otto@oopuo.com', 'test1234');
  global.TOKEN = loginResult.token;
  console.log('Authenticated');

  // Fetch Notion goals
  const pages = await fetchAllGoals();
  const goals = pages.map(extractGoal);
  console.log(`Total goals from Notion: ${goals.length}`);

  // Fetch projects
  const projects = await api('GET', '/api/projects');
  console.log(`Projects: ${(projects.data||projects).length}`);
  const projList = projects.data || projects;

  // Also fetch company pages to map company IDs to names
  // We'll match by goal title containing project name
  const projKeywords = {};
  for (const p of projList) {
    if (p.name) projKeywords[p.name.toLowerCase()] = p.id;
  }
  console.log('Project names:', Object.keys(projKeywords));

  function matchProject(goal) {
    const t = goal.title.toLowerCase();
    for (const [name, id] of Object.entries(projKeywords)) {
      if (t.includes(name.toLowerCase())) return id;
    }
    return null;
  }

  // Delete existing goals
  const existing = await api('GET', '/api/goals');
  const existingGoals = existing.data || existing || [];
  console.log(`Deleting ${existingGoals.length} existing goals...`);
  for (const g of existingGoals) {
    await api('DELETE', `/api/goals/${g.id}`);
    await sleep(100);
  }
  console.log('Deleted all existing goals');

  // Build parent map and create in order
  const notionIdMap = {}; // notionId -> our ID
  const goalsByNotionId = {};
  for (const g of goals) goalsByNotionId[g.notionId] = g;

  let remaining = [...goals];
  let pass = 0;
  let totalCreated = 0;

  while (remaining.length > 0) {
    pass++;
    const nextRemaining = [];
    let createdThisPass = 0;

    for (const g of remaining) {
      // Check if all parents are created
      const parentIds = g.parentNotionIds.filter(pid => goalsByNotionId[pid]); // only count parents that exist in our DB
      const allParentsReady = parentIds.every(pid => notionIdMap[pid]);
      
      if (parentIds.length === 0 || allParentsReady) {
        const parentId = parentIds.length > 0 ? notionIdMap[parentIds[0]] : null;
        const body = {
          title: g.title,
          description: g.keyResults || '',
          project_id: matchProject(g),
          target_date: g.dueDate,
          cadence: g.cadence,
          status: 'active',
          parent_id: parentId,
          level: g.level,
          progress: g.progress,
          notion_id: g.notionId
        };
        try {
          await sleep(150);
          const result = await api('POST', '/api/goals', body);
          const newId = result.data?.id || result.id;
          if (newId) {
            notionIdMap[g.notionId] = newId;
            createdThisPass++;
            totalCreated++;
          } else if (result.error?.includes('Too many')) {
            await sleep(2000);
            const retry = await api('POST', '/api/goals', body);
            const retryId = retry.data?.id || retry.id;
            if (retryId) { notionIdMap[g.notionId] = retryId; createdThisPass++; totalCreated++; }
            else { nextRemaining.push(g); }
          } else {
            console.log(`Failed: ${g.title}`, JSON.stringify(result).slice(0,200));
            nextRemaining.push(g);
          }
        } catch(e) {
          console.log(`Error: ${g.title}: ${e.message}`);
          nextRemaining.push(g);
        }
      } else {
        nextRemaining.push(g);
      }
    }

    console.log(`Pass ${pass}: created ${createdThisPass}, remaining ${nextRemaining.length}`);
    if (createdThisPass === 0 && nextRemaining.length > 0) {
      console.log(`Orphaned goals (parent not in DB): ${nextRemaining.length}`);
      // Create orphans with best available parent
      for (const g of nextRemaining) {
        const parentId = g.parentNotionIds.map(pid => notionIdMap[pid]).find(Boolean) || null;
        const body = {
          title: g.title, description: g.keyResults || '',
          project_id: matchProject(g), target_date: g.dueDate,
          cadence: g.cadence, status: 'active', parent_id: parentId,
          level: g.level, progress: g.progress, notion_id: g.notionId
        };
        await sleep(200);
        const result = await api('POST', '/api/goals', body);
        if (result.error?.includes('Too many')) {
          await sleep(3000);
          const retry = await api('POST', '/api/goals', body);
          const retryId = retry.data?.id || retry.id;
          if (retryId) { notionIdMap[g.notionId] = retryId; totalCreated++; }
        } else {
          const newId = result.data?.id || result.id;
          if (newId) { notionIdMap[g.notionId] = newId; totalCreated++; }
        }
      }
      break;
    }
    remaining = nextRemaining;
  }

  console.log(`\nTotal created: ${totalCreated}/${goals.length}`);
  console.log(`Hierarchy passes: ${pass}`);

  // Task linking
  try {
    const tasks = await api('GET', '/api/tasks');
    const taskList = Array.isArray(tasks) ? tasks : (tasks.data || []);
    let linked = 0;
    for (const task of taskList) {
      const tTitle = (task.title || '').toLowerCase();
      for (const g of goals) {
        if (g.title.toLowerCase().includes(tTitle) || tTitle.includes(g.title.toLowerCase())) {
          if (notionIdMap[g.notionId] && tTitle.length > 3) {
            await api('PATCH', `/api/tasks/${task.id}`, { goal_id: notionIdMap[g.notionId] });
            linked++;
            break;
          }
        }
      }
    }
    console.log(`Linked ${linked} tasks to goals`);
  } catch(e) {
    console.log(`Task linking skipped: ${e.message}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
