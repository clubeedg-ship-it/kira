const TOKEN = require('/home/adminuser/kira/dashboard/auth.js').login('otto@oopuo.com','test1234').token;
const BASE = 'http://localhost:3847';
const h = { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

async function api(method, path, body) {
  const r = await fetch(`${BASE}${path}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text();
  try { return JSON.parse(t); } catch { return t; }
}

async function main() {
  // Existing project IDs
  const ZENITH = '2add10ae-8006-47e3-86a5-5f4237169370';
  const OTTOGEN = 'c731fe0f-804c-41e6-839b-a3491100475c';
  const KIRA = '37a3074d-9af7-40fd-9c79-dcb0f2329630';
  const CHIMERA = 'e2414f84-101d-4ede-a8d8-cce6798576ff';

  // Update OttoGen to active (launch prep)
  await api('PATCH', `/api/projects/${OTTOGEN}`, { status: 'active', description: "Otto's personal brand — AI services for SMBs + content/webinars. Swiss Cyberpunk aesthetic." });

  // Create new projects
  const newProjects = [
    { title: 'IAM (Interactive Move)', description: 'Interactive floor/wall projectors for kindergartens & offices. Hardware + content. interactivemove.nl', status: 'active', deadline: '2026-06-01' },
    { title: 'CuttingEdge', description: 'Interior design & rebuilding project management', status: 'active', deadline: '2026-12-31' },
    { title: 'Abura Cosmetics', description: 'Sales support for cosmetics brand', status: 'active', deadline: '2026-12-31' },
    { title: 'SentinAgro', description: 'Drone cattle monitoring — future venture', status: 'backlog', deadline: '2026-12-31' },
    { title: 'Oopuo (Umbrella)', description: 'Parent company — $1B valuation target. Holds all ventures.', status: 'active', deadline: '2026-10-01' },
    { title: 'Nexus OS', description: 'Personal AI OS — MVP built', status: 'paused', deadline: '2026-06-01' },
  ];

  const projectIds = { ZENITH, OTTOGEN, KIRA, CHIMERA };
  for (const p of newProjects) {
    const r = await api('POST', '/api/projects', p);
    const key = p.title.split(' ')[0].toUpperCase().replace(/[^A-Z]/g,'');
    projectIds[key] = r.id;
    console.log(`Project: ${p.title} → ${r.id}`);
  }
  const IAM = projectIds['IAM'];
  const CUTTING = projectIds['CUTTINGEDGE'];
  const ABURA = projectIds['ABURA'];
  const SENTI = projectIds['SENTINAGRO'];
  const OOPUO = projectIds['OOPUO'];
  const NEXUS = projectIds['NEXUS'];

  // Create goals
  const goals = [
    { title: '$1B Oopuo Valuation', description: 'Umbrella goal: reach $1B valuation for Oopuo portfolio', project_id: OOPUO, target_date: '2026-10-01', cadence: 'yearly', status: 'active' },
    { title: 'ZenithCred Seed Round €1.1M', description: 'Close seed round at €2.5-3.5M pre-money valuation', project_id: ZENITH, target_date: '2026-04-15', cadence: 'quarterly', status: 'active' },
    { title: 'First Paying OttoGen Client', description: 'Land first paying SMB client for AI services', project_id: OTTOGEN, target_date: '2026-03-01', cadence: 'monthly', status: 'active' },
    { title: 'OttoGen Monthly Recurring Revenue', description: 'Establish recurring revenue from AI services', project_id: OTTOGEN, target_date: '2026-06-01', cadence: 'monthly', status: 'active' },
    { title: 'Chimera MVP', description: 'Complete Chimera distributed AI infrastructure — consultant + savant + ZK', project_id: CHIMERA, target_date: '2026-06-01', cadence: 'quarterly', status: 'active' },
    { title: 'OttoGen Brand Launch', description: 'Website, webinars, content pipeline, social presence', project_id: OTTOGEN, target_date: '2026-03-15', cadence: 'monthly', status: 'active' },
    { title: 'IAM Kindergarten Revenue', description: 'Close kindergarten deals via sales pipeline', project_id: IAM, target_date: '2026-04-01', cadence: 'monthly', status: 'active' },
    { title: 'Kira Platform v1.0', description: 'Ship SaaS dashboard with chat, tasks, memory, knowledge graph', project_id: KIRA, target_date: '2026-03-15', cadence: 'quarterly', status: 'active' },
    { title: 'SentinAgro Pitch Ready', description: 'Have investor deck and pitch ready for SentinAgro', project_id: SENTI, target_date: '2026-05-01', cadence: 'quarterly', status: 'active' },
  ];

  const goalIds = {};
  for (const g of goals) {
    const r = await api('POST', '/api/goals', g);
    goalIds[g.title] = r.id;
    console.log(`Goal: ${g.title} → ${r.id}`);
  }

  // Create tasks — comprehensive extraction from all docs
  const tasks = [
    // === ZENITHCRED ===
    { title: 'ZenithCred investor pitch deck', description: 'Complete investor deck for seed round', project_id: ZENITH, goal_id: goalIds['ZenithCred Seed Round €1.1M'], status: 'doing', priority: 0, effort: 'L', assignee: 'kira' },
    { title: 'ZenithCred financial projections', description: 'Build 5-year financial model (hardware + SaaS hybrid)', project_id: ZENITH, goal_id: goalIds['ZenithCred Seed Round €1.1M'], status: 'done', priority: 1, effort: 'L', assignee: 'kira' },
    { title: 'ZenithCred pilot targets list', description: '10 target companies for pilot (100-300 employees, NL/DACH)', project_id: ZENITH, goal_id: goalIds['ZenithCred Seed Round €1.1M'], status: 'done', priority: 1, effort: 'M', assignee: 'kira' },
    { title: 'ZenithCred product design doc', description: 'Complete product design v1.2 — HRV-first positioning', project_id: ZENITH, goal_id: goalIds['ZenithCred Seed Round €1.1M'], status: 'done', priority: 1, effort: 'L', assignee: 'kira' },
    { title: 'EEG neurofeedback credibility research', description: 'Research consumer EEG accuracy for wellness claims', project_id: ZENITH, goal_id: goalIds['ZenithCred Seed Round €1.1M'], status: 'done', priority: 2, effort: 'M', assignee: 'kira' },
    { title: 'ZenithCred investor email sequence', description: '4-email cold outreach sequence for VCs', project_id: ZENITH, goal_id: goalIds['ZenithCred Seed Round €1.1M'], status: 'done', priority: 1, effort: 'S', assignee: 'kira' },
    { title: 'VC research — 20 Benelux wellness investors', description: 'Research and list target VCs for seed round', project_id: ZENITH, goal_id: goalIds['ZenithCred Seed Round €1.1M'], status: 'doing', priority: 1, effort: 'M', assignee: 'kira' },
    { title: 'ZenithCred MVP prototype', description: 'Build demo-ready prototype: simulated biofeedback + gamification + dashboard', project_id: ZENITH, goal_id: goalIds['ZenithCred Seed Round €1.1M'], status: 'backlog', priority: 1, effort: 'XL', assignee: 'user', due_date: '2026-04-01' },

    // === OTTOGEN ===
    { title: 'OttoGen website v5', description: 'Chat interface, rich animated cards, SMB pain-resonant steps', project_id: OTTOGEN, goal_id: goalIds['OttoGen Brand Launch'], status: 'doing', priority: 1, effort: 'L', assignee: 'kira' },
    { title: 'OttoGen webinar Module 1 outline', description: '"How AI Can Actually Help Your Business" — 45 min live session', project_id: OTTOGEN, goal_id: goalIds['OttoGen Brand Launch'], status: 'done', priority: 1, effort: 'M', assignee: 'kira' },
    { title: 'OttoGen service packages', description: '3 tiers: Starter/Growth/Enterprise pricing', project_id: OTTOGEN, goal_id: goalIds['First Paying OttoGen Client'], status: 'done', priority: 1, effort: 'M', assignee: 'kira' },
    { title: 'OttoGen landing page copy', description: 'Full landing page with Swiss Cyberpunk aesthetic', project_id: OTTOGEN, goal_id: goalIds['OttoGen Brand Launch'], status: 'done', priority: 1, effort: 'M', assignee: 'kira' },
    { title: 'OttoGen first 10 clients playbook', description: '30-day tactical plan to land first clients', project_id: OTTOGEN, goal_id: goalIds['First Paying OttoGen Client'], status: 'done', priority: 0, effort: 'M', assignee: 'kira' },
    { title: 'OttoGen LinkedIn content calendar Feb-Mar', description: 'Content pipeline for social presence', project_id: OTTOGEN, goal_id: goalIds['OttoGen Brand Launch'], status: 'doing', priority: 2, effort: 'M', assignee: 'kira' },
    { title: 'Record and deliver first webinar', description: 'Execute webinar Module 1 live session', project_id: OTTOGEN, goal_id: goalIds['OttoGen Brand Launch'], status: 'backlog', priority: 1, effort: 'L', assignee: 'user', due_date: '2026-03-01' },
    { title: 'Sales automation setup', description: 'Configure Apollo.io/Instantly/Clay for SMB outreach pipeline', project_id: OTTOGEN, goal_id: goalIds['First Paying OttoGen Client'], status: 'backlog', priority: 1, effort: 'L', assignee: 'kira' },

    // === IAM ===
    { title: 'IAM competitive analysis', description: 'Market landscape: EyeClick, KIDSjumpTECH, WizeFloor, etc.', project_id: IAM, goal_id: goalIds['IAM Kindergarten Revenue'], status: 'done', priority: 2, effort: 'M', assignee: 'kira' },
    { title: 'IAM kindergarten prospect list (50+)', description: 'Real Dutch kindergarten chains with contact info', project_id: IAM, goal_id: goalIds['IAM Kindergarten Revenue'], status: 'done', priority: 1, effort: 'M', assignee: 'kira' },
    { title: 'IAM cold outreach templates (NL+EN)', description: '3 email templates for kindergarten directors', project_id: IAM, goal_id: goalIds['IAM Kindergarten Revenue'], status: 'done', priority: 1, effort: 'S', assignee: 'kira' },
    { title: 'IAM sales one-pager', description: 'Benefits-focused sales doc for kindergarten market', project_id: IAM, goal_id: goalIds['IAM Kindergarten Revenue'], status: 'done', priority: 1, effort: 'S', assignee: 'kira' },
    { title: 'IAM landing page copy', description: 'Full 7-section page ready for Dutch translation', project_id: IAM, goal_id: goalIds['IAM Kindergarten Revenue'], status: 'done', priority: 1, effort: 'M', assignee: 'kira' },
    { title: 'IAM free trial package design', description: 'Design free trial for kindergarten conversions', project_id: IAM, goal_id: goalIds['IAM Kindergarten Revenue'], status: 'doing', priority: 1, effort: 'M', assignee: 'kira' },
    { title: 'Finish IAM website (existing repo)', description: 'github.com/clubeedg-ship-it/iam-website — unfinished items', project_id: IAM, goal_id: goalIds['IAM Kindergarten Revenue'], status: 'todo', priority: 1, effort: 'M', assignee: 'user' },
    { title: 'Start kindergarten outreach campaign', description: 'Execute cold email campaign to 50+ targets', project_id: IAM, goal_id: goalIds['IAM Kindergarten Revenue'], status: 'backlog', priority: 1, effort: 'L', assignee: 'user' },

    // === CHIMERA ===
    { title: 'Chimera README + ARCHITECTURE docs', description: 'Public-facing documentation for Chimera', project_id: CHIMERA, goal_id: goalIds['Chimera MVP'], status: 'doing', priority: 1, effort: 'M', assignee: 'kira' },
    { title: 'Savant manager improvements', description: 'Enhance blind executor with better job scheduling', project_id: CHIMERA, goal_id: goalIds['Chimera MVP'], status: 'backlog', priority: 1, effort: 'L', assignee: 'kira' },
    { title: 'Nexus Neo4j integration', description: 'Connect Nexus OS to Neo4j knowledge graph', project_id: CHIMERA, goal_id: goalIds['Chimera MVP'], status: 'backlog', priority: 2, effort: 'L', assignee: 'kira' },
    { title: 'Chimera code reviews', description: 'Review pending PRs with local models', project_id: CHIMERA, goal_id: goalIds['Chimera MVP'], status: 'backlog', priority: 2, effort: 'M', assignee: 'kira' },

    // === KIRA PLATFORM ===
    { title: 'Chat UI design & implementation', description: 'Telegram-like bidirectional sync, rich blocks, live animations', project_id: KIRA, goal_id: goalIds['Kira Platform v1.0'], status: 'done', priority: 0, effort: 'XL', assignee: 'kira' },
    { title: 'Dashboard pages (Tasks, Goals, KG, VDR, Settings)', description: 'All 6 dashboard pages with kanban, D3 graph, etc.', project_id: KIRA, goal_id: goalIds['Kira Platform v1.0'], status: 'done', priority: 0, effort: 'XL', assignee: 'kira' },
    { title: 'AI provider system', description: 'Multi-provider: Anthropic, OpenAI, Ollama, ClaudeOAuth — pure fetch', project_id: KIRA, goal_id: goalIds['Kira Platform v1.0'], status: 'done', priority: 1, effort: 'L', assignee: 'kira' },
    { title: 'Add OpenRouter as provider', description: 'Simplest multi-model option for users', project_id: KIRA, goal_id: goalIds['Kira Platform v1.0'], status: 'todo', priority: 1, effort: 'M', assignee: 'kira' },
    { title: 'Tauri v2 desktop app packaging', description: 'Native desktop shell via Tauri', project_id: KIRA, goal_id: goalIds['Kira Platform v1.0'], status: 'backlog', priority: 2, effort: 'L', assignee: 'kira' },
    { title: 'Per-user token tracking/billing UI', description: 'Usage metering and billing dashboard', project_id: KIRA, goal_id: goalIds['Kira Platform v1.0'], status: 'backlog', priority: 2, effort: 'L', assignee: 'kira' },
    { title: 'Onboarding wizard', description: 'First-run setup flow with gamification', project_id: KIRA, goal_id: goalIds['Kira Platform v1.0'], status: 'done', priority: 2, effort: 'M', assignee: 'kira' },
    { title: 'Deploy to app.zenithcred.com', description: 'Cloudflare Tunnel + Docker deployment', project_id: KIRA, goal_id: goalIds['Kira Platform v1.0'], status: 'done', priority: 0, effort: 'M', assignee: 'kira' },
    { title: 'Kira dashboard chat UI design doc', description: 'Design for rich chat with expandable blocks', project_id: KIRA, goal_id: goalIds['Kira Platform v1.0'], status: 'done', priority: 1, effort: 'M', assignee: 'kira' },
    { title: 'Victor Taelin worklog feature', description: 'Hourly check-in + timeline Gantt view for team', project_id: KIRA, goal_id: goalIds['Kira Platform v1.0'], status: 'backlog', priority: 3, effort: 'L', assignee: 'kira' },

    // === SENTINAGRO ===
    { title: 'SentinAgro investor pitch deck', description: 'Investor deck for drone cattle monitoring venture', project_id: SENTI, goal_id: goalIds['SentinAgro Pitch Ready'], status: 'todo', priority: 1, effort: 'L', assignee: 'kira' },
    { title: 'SentinAgro market research', description: 'AgTech drone monitoring market size, competitors, regulations', project_id: SENTI, goal_id: goalIds['SentinAgro Pitch Ready'], status: 'backlog', priority: 2, effort: 'M', assignee: 'kira' },

    // === OOPUO UMBRELLA ===
    { title: 'Oopuo umbrella pitch deck', description: 'Portfolio-level deck showing all ventures', project_id: OOPUO, goal_id: goalIds['$1B Oopuo Valuation'], status: 'todo', priority: 1, effort: 'L', assignee: 'kira' },
    { title: 'Otto entrepreneur visa research', description: 'NL entrepreneur visa: 90-point IND system, MVV from São Paulo', project_id: OOPUO, goal_id: goalIds['$1B Oopuo Valuation'], status: 'done', priority: 0, effort: 'L', assignee: 'kira' },
    { title: 'Consult immigration lawyer', description: 'Critical: verify visa plan before leaving NL', project_id: OOPUO, goal_id: goalIds['$1B Oopuo Valuation'], status: 'todo', priority: 0, effort: 'S', assignee: 'user', due_date: '2026-03-01' },
    { title: 'Intent extraction from VDR docs', description: 'Read all vdr/*.md, synthesize goals/constraints, update MEMORY.md', project_id: OOPUO, goal_id: goalIds['$1B Oopuo Valuation'], status: 'todo', priority: 1, effort: 'L', assignee: 'kira' },
    { title: '$1B reality check & reframe strategy', description: 'Realistic target €5-60M portfolio. Foundation-building narrative.', project_id: OOPUO, goal_id: goalIds['$1B Oopuo Valuation'], status: 'done', priority: 1, effort: 'M', assignee: 'kira' },

    // === ABURA ===
    { title: 'Abura sales support setup', description: 'Configure sales tools and processes for Abura Cosmetics', project_id: ABURA, status: 'backlog', priority: 2, effort: 'M', assignee: 'user' },

    // === CUTTINGEDGE ===
    { title: 'CuttingEdge maintenance mode', description: 'Keep CuttingEdge running, minimal investment per strategy', project_id: CUTTING, status: 'doing', priority: 3, effort: 'S', assignee: 'user' },

    // === COMMUNITY ===
    { title: 'Moltbook engagement', description: 'Build Chimera audience on Moltbook (@Kira_Otto). Movement-building, not strategy disclosure.', project_id: OOPUO, status: 'doing', priority: 3, effort: 'S', assignee: 'kira' },
  ];

  let taskCount = 0;
  for (const t of tasks) {
    const r = await api('POST', '/api/tasks', t);
    if (r.id) taskCount++;
    else console.log(`FAIL: ${t.title} → ${JSON.stringify(r)}`);
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Projects created: ${newProjects.length} new + 4 existing (1 updated)`);
  console.log(`Goals created: ${goals.length}`);
  console.log(`Tasks created: ${taskCount} (+ 5 existing Chimera tasks)`);
}

main().catch(e => console.error(e));
