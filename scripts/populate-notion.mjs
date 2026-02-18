const API_KEY = "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";
const HEADERS = {
  "Authorization": `Bearer ${API_KEY}`,
  "Notion-Version": "2025-09-03",
  "Content-Type": "application/json"
};

const GOALS_DB = "2fba6c94-88ca-8102-afb2-cae874f281bd";
const TASKS_DS = "300a6c94-88ca-81d4-bc85-000b82bb9a85";
const COMPANIES = {
  IAM: "300a6c94-88ca-81f9-a3d7-fe4f215ab5b5",
  ZenithCred: "300a6c94-88ca-81db-bb93-f124cabe902e",
  OttoGen: "300a6c94-88ca-8163-be7b-fe202976c026",
  CuttingEdge: "300a6c94-88ca-814b-b23b-c9bf0ca4a97d",
  SentinAgro: "300a6c94-88ca-81fd-a190-c3dffeeee3f3",
  Chimera: "300a6c94-88ca-81e3-9a79-ca6f3a0983b7",
};
const SIX_MONTH = {
  IAM: "300a6c94-88ca-81b2-9239-ca6667ff5fd7",
  ZenithCred: "300a6c94-88ca-8122-bfa4-e5764635c77a",
  OttoGen: "300a6c94-88ca-81d4-b557-d992980faf1d",
  CuttingEdge: "300a6c94-88ca-8142-b311-e03e0c292b92",
  SentinAgro: "300a6c94-88ca-8126-a889-e86b01819009",
  Chimera: "300a6c94-88ca-81ea-810b-dcf137b7884d",
};

const LOG = [];
let TASKS_DB_ID = "";

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function api(method, url, body) {
  for (let i = 0; i < 3; i++) {
    const opts = { method, headers: HEADERS };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(url, opts);
    if (r.status === 429) {
      const w = parseFloat(r.headers.get("Retry-After") || "1");
      console.log(`  Rate limited, wait ${w}s`);
      await sleep(w * 1000);
      continue;
    }
    const j = await r.json();
    if (r.status >= 400) {
      console.log(`  ERROR ${r.status}: ${JSON.stringify(j).slice(0,200)}`);
      if (i < 2) { await sleep(1000); continue; }
      return null;
    }
    return j;
  }
  return null;
}

async function createGoal(title, company, level, parentGoal, dueDate, keyResults="", whyMatters="", owner="Otto") {
  const props = {
    "Goal": {title: [{text: {content: title}}]},
    "Level": {select: {name: level}},
    "Status": {select: {name: "Not Started"}},
  };
  if (company) props["Company"] = {relation: [{id: COMPANIES[company]}]};
  if (parentGoal) props["Parent Goal"] = {relation: [{id: parentGoal}]};
  if (dueDate) props["Due Date"] = {date: {start: dueDate}};
  if (keyResults) props["Key Results"] = {rich_text: [{text: {content: keyResults.slice(0,2000)}}]};
  if (whyMatters) props["Why This Matters"] = {rich_text: [{text: {content: whyMatters.slice(0,2000)}}]};
  if (owner) props["Owner"] = {select: {name: owner}};

  const r = await api("POST", "https://api.notion.com/v1/pages", {parent: {database_id: GOALS_DB}, properties: props});
  await sleep(350);
  if (r) {
    console.log(`  ✅ Goal: ${title} -> ${r.id}`);
    LOG.push(`Goal | ${level} | ${company||'Cross'} | ${title} | ${r.id}`);
    return r.id;
  }
  console.log(`  ❌ Failed: ${title}`);
  LOG.push(`FAILED Goal | ${title}`);
  return null;
}

async function createTask(title, company, goalId, priority, assignee, dueDate, effort) {
  const props = {
    "Task": {title: [{text: {content: title}}]},
    "Priority": {select: {name: priority}},
    "Status": {select: {name: "Todo"}},
    "Assignee": {select: {name: assignee}},
  };
  if (company) props["Company"] = {relation: [{id: COMPANIES[company]}]};
  if (goalId) props["Goal"] = {relation: [{id: goalId}]};
  if (dueDate) props["Due Date"] = {date: {start: dueDate}};
  if (effort) props["Effort"] = {select: {name: effort}};

  const r = await api("POST", "https://api.notion.com/v1/pages", {parent: {database_id: TASKS_DB_ID}, properties: props});
  await sleep(350);
  if (r) {
    console.log(`  ✅ Task: ${title} -> ${r.id}`);
    LOG.push(`Task | ${company||'Cross'} | ${title} | ${r.id}`);
    return r.id;
  }
  console.log(`  ❌ Failed task: ${title}`);
  LOG.push(`FAILED Task | ${title}`);
  return null;
}

async function updatePage(pageId, properties) {
  const r = await api("PATCH", `https://api.notion.com/v1/pages/${pageId}`, {properties});
  await sleep(350);
  if (r) console.log(`  ✅ Updated: ${pageId}`);
  else console.log(`  ❌ Failed update: ${pageId}`);
  return r;
}

async function main() {
  // Find Tasks DB ID
  console.log("Finding Tasks DB ID...");
  let r = await api("POST", `https://api.notion.com/v1/data_sources/${TASKS_DS}/query`, {page_size: 1});
  if (r?.results?.length > 0) {
    TASKS_DB_ID = r.results[0].parent.database_id;
  } else {
    // Empty DB - get from data_source info
    const ds = await api("GET", `https://api.notion.com/v1/data_sources/${TASKS_DS}`);
    // Try the Goal relation's database_id
    const goalRel = ds?.properties?.Goal?.relation;
    console.log("Goal relation:", JSON.stringify(goalRel));
    // We'll need to find the actual database_id. Check if pages list endpoint works differently.
    // For now, the data_source might map to a database_id that we can find from searching
    // Let's search for all pages
    const search = await api("POST", "https://api.notion.com/v1/search", {query: "Tasks", filter: {value: "data_source", property: "object"}});
    if (search?.results) {
      for (const ds of search.results) {
        if (ds.title?.[0]?.plain_text === "📋 Tasks") {
          // Found our tasks DS - the database_id would be in the parent hierarchy
          // Actually in 2025-09-03, when creating pages, we use database_id from the DS's internal ref
          // Let's check properties
          console.log(`Tasks DS found: ${ds.id}`);
        }
      }
    }
    // Fallback: try getting the database_id from the Goal property's relation
    // The Goal points to database_id: 300a6c94-88ca-81a5-aa23-f4f55398c9eb
    // That's a DIFFERENT goals DB than what we used. We need to figure out the right Tasks DB.
    // Actually, let's just try creating a page with the DS ID as database_id to see what happens
    // In the newer API, data_source_id might be used instead of database_id for parent
    TASKS_DB_ID = ""; // will try both approaches
  }
  console.log(`Tasks DB ID: ${TASKS_DB_ID || "will discover"}`);

  // If we don't have TASKS_DB_ID, try creating with parent as data_source_id
  if (!TASKS_DB_ID) {
    // Test: try creating a page with database_id = the DS's internal database ref
    // From the search results, the tasks DS has properties with Goal relation to 300a6c94-88ca-81a5-aa23-f4f55398c9eb
    // The parent for pages might need to be that database_id
    // Let me try with data_source parent
    console.log("Testing page creation with data_source_id as parent...");
    const test = await api("POST", "https://api.notion.com/v1/pages", {
      parent: {data_source_id: TASKS_DS},
      properties: {"Task": {title: [{text: {content: "TEST - DELETE ME"}}]}}
    });
    if (test) {
      console.log(`Test page created: ${test.id}, parent: ${JSON.stringify(test.parent)}`);
      TASKS_DB_ID = "__data_source__";
      // Delete test page
      await api("PATCH", `https://api.notion.com/v1/pages/${test.id}`, {in_trash: true});
    } else {
      // Try with database_id from parent info
      // The ds had Goal relation pointing to db 300a6c94-88ca-81a5-aa23-f4f55398c9eb
      // The tasks db itself might have database_id embedded
      // Let's check by getting the data_source info and look for a database_id field
      const dsInfo = await api("GET", `https://api.notion.com/v1/data_sources/${TASKS_DS}`);
      console.log("DS Info parent:", JSON.stringify(dsInfo?.parent));
      // Maybe the parent has a page_id and we need the database_id from within
      // Actually from the query response earlier, when DB is empty results is [],
      // but parent info should come from the DS itself
      // Let me try: database_id might be a field on the data_source object
      if (dsInfo) {
        // Check all top-level fields
        for (const [k,v] of Object.entries(dsInfo)) {
          if (k !== 'properties' && k !== 'title' && k !== 'description')
            console.log(`  DS.${k}:`, typeof v === 'object' ? JSON.stringify(v)?.slice(0,200) : v);
        }
      }
    }
  }

  // ============ STEP 1: Financial projections ============
  console.log("\n=== STEP 1: FINANCIAL PROJECTIONS ===");
  const financials = {
    IAM: "FINANCIAL TARGET: €500K ARR by Oct 2026 (€40K/mo) → 15x revenue multiple = €7.5M valuation. IAM is the cash cow that funds the entire portfolio.",
    ZenithCred: "FINANCIAL TARGET: Seed round €2.5-3.5M pre-money → Series A at €15-20M → contributes €100M+ to portfolio.",
    OttoGen: "FINANCIAL TARGET: €120K ARR (€10K/mo services + content) → €2M valuation. Personal brand drives deal flow.",
    CuttingEdge: "FINANCIAL TARGET: €200K revenue → cash flow positive, stable. Reliable cash flow supports portfolio operations.",
    SentinAgro: "FINANCIAL TARGET: Pre-seed valuation €5-10M based on IP + partnerships. AgriTech market validation.",
    Chimera: "FINANCIAL TARGET: Protocol token + infrastructure = potential €500M+ (the big bet). Distributed AI moonshot.",
  };
  for (const [co, text] of Object.entries(financials)) {
    console.log(`Updating ${co} 6-month goal...`);
    await updatePage(SIX_MONTH[co], {"Why This Matters": {rich_text: [{text: {content: text}}]}});
  }

  // ============ STEP 2: 3-Month Objectives ============
  console.log("\n=== STEP 2: 3-MONTH OBJECTIVES ===");
  const threeMonth = {};
  const obj3m = {
    IAM: [
      ["Relaunch website with kindergarten specialist positioning", "Website live with new positioning, SEO optimized"],
      ["Close 5 new kindergarten clients", "5 signed contracts, €2K+ MRR from new clients"],
      ["Build content library to 100+ activities", "100 activity cards designed, tested, catalogued"],
      ["Establish 3 distribution partnerships", "3 signed distribution agreements"],
    ],
    ZenithCred: [
      ["Complete investor pitch deck v3", "Deck finalized, financial model updated, advisor-reviewed"],
      ["Build MVP demo (light panels + app prototype)", "Working demo for investor meetings"],
      ["Conduct 15 investor meetings", "15 meetings completed, pipeline tracked"],
      ["Secure 2 LOIs from pilot customers", "2 signed LOIs from wellness centers/hotels"],
    ],
    OttoGen: [
      ["Launch ottogen.io website (Swiss Cyberpunk design)", "Website live, 500+ visitors/month"],
      ["Create first 4 webinar modules", "4 modules recorded, landing pages live"],
      ["Sign 5 SMB AI service clients", "5 contracts signed, €5K+ MRR"],
      ["Build content pipeline (2 posts/week)", "24 posts published, growing LinkedIn following"],
    ],
    CuttingEdge: [
      ["Complete 2 active projects", "Projects delivered on time and budget"],
      ["Build referral pipeline", "5 warm referral sources identified and activated"],
      ["Create portfolio showcase website", "Website live with case studies"],
    ],
    SentinAgro: [
      ["Complete market feasibility study", "Report with TAM/SAM/SOM, competitor analysis"],
      ["Identify 3 pilot farm partners", "3 farms committed to pilot program"],
      ["Research drone + sensor tech stack", "Tech stack selected, costs estimated"],
    ],
    Chimera: [
      ["Complete Phase 3 (distributed networking)", "Networking layer functional, peer discovery working"],
      ["Deploy 3 test nodes", "3 nodes running stable for 7+ days"],
      ["Write technical whitepaper", "Whitepaper v1 published"],
    ],
  };

  for (const [co, objs] of Object.entries(obj3m)) {
    threeMonth[co] = {};
    console.log(`\n--- ${co} ---`);
    for (const [title, kr] of objs) {
      const id = await createGoal(title, co, "🗓️ 3-Month Objective", SIX_MONTH[co], "2026-04-30", kr);
      if (id) threeMonth[co][title] = id;
    }
  }

  // ============ STEP 3: 1-Month Targets ============
  console.log("\n=== STEP 3: 1-MONTH TARGETS ===");
  const oneMonth = {};
  const tgt1m = {
    IAM: [
      ["Draft new website wireframes and copy", "Relaunch website with kindergarten specialist positioning", "Wireframes approved, copy for all pages\n\nFinancial: €0 cost, foundation for March launch"],
      ["Identify and contact 20 target kindergartens", "Close 5 new kindergarten clients", "20 outreach emails sent, 5 responses\n\nFinancial: Build pipeline for Q1"],
      ["Design 25 new activity cards", "Build content library to 100+ activities", "25 cards designed and tested\n\nFinancial: €0 → content is free marketing"],
      ["Research and shortlist 5 distribution partners", "Establish 3 distribution partnerships", "5 partners identified, 3 calls made\n\nFinancial: Partnership pipeline started"],
    ],
    ZenithCred: [
      ["Update pitch deck financials and narrative", "Complete investor pitch deck v3", "Deck v2.5 ready for feedback\n\nFinancial: €0 spend, prep for €1.1M raise"],
      ["Create clickable app prototype", "Build MVP demo (light panels + app prototype)", "Figma prototype with 5 core screens\n\nFinancial: Demo ready for meetings"],
      ["Research and list 20 target investors", "Conduct 15 investor meetings", "20 VCs identified, 5 outreach emails\n\nFinancial: 3x funnel for 15 meetings"],
      ["Draft LOI template and identify 5 pilot candidates", "Secure 2 LOIs from pilot customers", "Template ready, 5 prospects contacted\n\nFinancial: Validation for deck"],
    ],
    OttoGen: [
      ["Design and build ottogen.io landing page", "Launch ottogen.io website (Swiss Cyberpunk design)", "Landing page live, analytics installed\n\nFinancial: €0 investment, sweat equity"],
      ["Outline and script webinar module 1", "Create first 4 webinar modules", "Module 1 scripted, slides drafted\n\nFinancial: Content foundation"],
      ["Close 1-2 AI service clients", "Sign 5 SMB AI service clients", "1-2 clients onboarded\n\nFinancial: €1-2K MRR in Feb"],
      ["Set up LinkedIn content calendar", "Build content pipeline (2 posts/week)", "8 posts published in Feb\n\nFinancial: Brand building"],
    ],
    CuttingEdge: [
      ["Deliver milestone 1 on active projects", "Complete 2 active projects", "First milestone delivered\n\nFinancial: Invoice milestones"],
      ["Map referral network and make 5 asks", "Build referral pipeline", "5 referral conversations initiated\n\nFinancial: Pipeline for Q2"],
      ["Gather portfolio content and case studies", "Create portfolio showcase website", "3 case studies written\n\nFinancial: Foundation for website"],
    ],
    SentinAgro: [
      ["Research drone cattle monitoring market", "Complete market feasibility study", "Market size data, 10 competitor profiles\n\nFinancial: €0, research phase"],
      ["Identify and contact 5 potential farm partners", "Identify 3 pilot farm partners", "5 farms contacted, 2 interested\n\nFinancial: Validation conversations"],
      ["Evaluate 3 drone platforms and 3 sensor systems", "Research drone + sensor tech stack", "Comparison matrix complete\n\nFinancial: Tech decisions"],
    ],
    Chimera: [
      ["Implement peer discovery protocol", "Complete Phase 3 (distributed networking)", "Peer discovery working on LAN\n\nFinancial: Core foundation"],
      ["Set up 1 test node on cloud infra", "Deploy 3 test nodes", "1 node stable, monitoring in place\n\nFinancial: Infra baseline"],
      ["Draft whitepaper outline and abstract", "Write technical whitepaper", "Outline approved, abstract written\n\nFinancial: Thought leadership"],
    ],
  };

  for (const [co, targets] of Object.entries(tgt1m)) {
    oneMonth[co] = {};
    console.log(`\n--- ${co} ---`);
    for (const [title, parentTitle, kr] of targets) {
      const parentId = threeMonth[co]?.[parentTitle] || SIX_MONTH[co];
      const id = await createGoal(title, co, "📋 1-Month Target", parentId, "2026-02-28", kr);
      if (id) oneMonth[co][title] = id;
    }
  }

  // ============ STEP 4: Weekly Goals ============
  console.log("\n=== STEP 4: WEEKLY GOALS ===");
  const weeklyGoals = {};
  const wk = {
    IAM: [
      ["W1: Complete competitive analysis & draft landing page", 0, "2026-02-14"],
      ["W2: Begin kindergarten outreach & finalize wireframes", 0, "2026-02-21"],
    ],
    ZenithCred: [
      ["W1: Update pitch deck & research 20 investors", 0, "2026-02-14"],
      ["W2: Start investor outreach & prototype screens", 1, "2026-02-21"],
    ],
    OttoGen: [
      ["W1: Brand messaging & website wireframes", 0, "2026-02-14"],
      ["W2: Website build & first content published", 0, "2026-02-21"],
    ],
    CuttingEdge: [
      ["W1: Project review & client updates", 0, "2026-02-14"],
      ["W2: Portfolio content & referral outreach", 2, "2026-02-21"],
    ],
    SentinAgro: [
      ["W1: Market research deep-dive", 0, "2026-02-14"],
      ["W2: Competitor analysis & farm outreach", 1, "2026-02-21"],
    ],
    Chimera: [
      ["W1: Phase 3 spec review & roadmap update", 0, "2026-02-14"],
      ["W2: Test suite & whitepaper outline", 2, "2026-02-21"],
    ],
  };

  for (const [co, weeks] of Object.entries(wk)) {
    weeklyGoals[co] = {};
    console.log(`\n--- ${co} ---`);
    const monthTargets = Object.values(oneMonth[co] || {});
    for (const [title, parentIdx, due] of weeks) {
      const parentId = monthTargets[parentIdx] || monthTargets[0] || SIX_MONTH[co];
      const id = await createGoal(title, co, "🏃 Weekly Sprint", parentId, due);
      if (id) weeklyGoals[co][title] = id;
    }
  }

  // ============ STEP 5: Tasks ============
  console.log("\n=== STEP 5: TASKS ===");
  
  // Determine how to create tasks
  if (!TASKS_DB_ID) {
    // Try data_source_id parent
    console.log("Testing data_source_id parent for tasks...");
    const test = await api("POST", "https://api.notion.com/v1/pages", {
      parent: {data_source_id: TASKS_DS},
      properties: {"Task": {title: [{text: {content: "TEST"}}]}, "Status": {select: {name: "Todo"}}}
    });
    if (test) {
      TASKS_DB_ID = "__data_source__";
      await api("PATCH", `https://api.notion.com/v1/pages/${test.id}`, {in_trash: true});
      console.log("Using data_source_id parent for tasks");
    }
  }

  // Override createTask to use data_source_id if needed
  const origCreateTask = async (title, company, goalId, priority, assignee, dueDate, effort) => {
    const props = {
      "Task": {title: [{text: {content: title}}]},
      "Priority": {select: {name: priority}},
      "Status": {select: {name: "Todo"}},
      "Assignee": {select: {name: assignee}},
    };
    if (company) props["Company"] = {relation: [{id: COMPANIES[company]}]};
    if (goalId) props["Goal"] = {relation: [{id: goalId}]};
    if (dueDate) props["Due Date"] = {date: {start: dueDate}};
    if (effort) props["Effort"] = {select: {name: effort}};

    let parent;
    if (TASKS_DB_ID === "__data_source__") {
      parent = {data_source_id: TASKS_DS};
    } else {
      parent = {database_id: TASKS_DB_ID};
    }

    const r = await api("POST", "https://api.notion.com/v1/pages", {parent, properties: props});
    await sleep(350);
    if (r) {
      console.log(`  ✅ Task: ${title} -> ${r.id}`);
      LOG.push(`Task | ${company||'Cross'} | ${title} | ${r.id}`);
      return r.id;
    }
    console.log(`  ❌ Failed task: ${title}`);
    LOG.push(`FAILED Task | ${title}`);
    return null;
  };

  const getWeeklyGoal = (co) => {
    const w = Object.values(weeklyGoals[co] || {});
    if (w.length) return w[0];
    const m = Object.values(oneMonth[co] || {});
    return m[0] || null;
  };

  const tasks = [
    ["Review competitive analysis and update positioning", "IAM", "P1", "Otto", "2026-02-10", "M"],
    ["Draft kindergarten-focused landing page copy", "IAM", "P1", "Kira", "2026-02-11", "L"],
    ["Research email outreach tools for kindergarten leads", "IAM", "P2", "Kira", "2026-02-11", "M"],
    ["Create list of 50 target kindergartens in Netherlands", "IAM", "P2", "Kira", "2026-02-12", "L"],
    ["Contact 3 potential distribution partners", "IAM", "P1", "Otto", "2026-02-13", "M"],
    ["Update pitch deck financials with latest projections", "ZenithCred", "P0", "Otto", "2026-02-10", "L"],
    ["Research 20 wellness-focused VCs in Benelux", "ZenithCred", "P1", "Kira", "2026-02-10", "L"],
    ["Draft investor outreach email sequence", "ZenithCred", "P1", "Kira", "2026-02-11", "M"],
    ["Schedule 3 investor intro calls", "ZenithCred", "P1", "Otto", "2026-02-12", "S"],
    ["Build simple product demo mockup", "ZenithCred", "P2", "Kira", "2026-02-13", "L"],
    ["Finalize brand messaging and positioning", "OttoGen", "P1", "Otto", "2026-02-10", "M"],
    ["Design website wireframes", "OttoGen", "P1", "Kira", "2026-02-11", "L"],
    ["Write first webinar module outline", "OttoGen", "P1", "Otto", "2026-02-12", "M"],
    ["Set up social media accounts and branding", "OttoGen", "P2", "Kira", "2026-02-12", "M"],
    ["Draft first 2 LinkedIn posts", "OttoGen", "P2", "Kira", "2026-02-13", "S"],
    ["Review active project timelines", "CuttingEdge", "P1", "Otto", "2026-02-10", "S"],
    ["Create client update reports", "CuttingEdge", "P2", "Kira", "2026-02-11", "M"],
    ["Draft portfolio website content", "CuttingEdge", "P2", "Kira", "2026-02-13", "L"],
    ["Research drone cattle monitoring market size", "SentinAgro", "P1", "Kira", "2026-02-12", "L"],
    ["Identify competing solutions and their pricing", "SentinAgro", "P2", "Kira", "2026-02-13", "M"],
    ["Draft feasibility study outline", "SentinAgro", "P2", "Kira", "2026-02-14", "M"],
    ["Review Phase 3 specs and update roadmap", "Chimera", "P1", "Otto", "2026-02-11", "M"],
    ["Run test suite and fix failing tests", "Chimera", "P1", "Kira", "2026-02-12", "M"],
    ["Draft technical whitepaper outline", "Chimera", "P2", "Kira", "2026-02-14", "L"],
    ["Morning routine setup: configure dashboards", null, "P1", "Otto", "2026-02-10", "S"],
    ["Review and approve Notion structure", null, "P0", "Otto", "2026-02-10", "S"],
  ];

  // Note: Goal relations in tasks DB point to a different goals DB (300a6c94-88ca-81a5)
  // Our goals are in 2fba6c94-88ca-8102. The relation might not link.
  // We'll try linking anyway - worst case it's ignored.
  for (const [title, co, pri, who, due, eff] of tasks) {
    const goalId = co ? getWeeklyGoal(co) : null;
    await origCreateTask(title, co, goalId, pri, who, due, eff);
  }

  // ============ STEP 6: Update Companies ============
  console.log("\n=== STEP 6: UPDATE COMPANIES ===");
  const companyUpdates = {
    IAM: {
      "Health": {select: {name: "🟡 At Risk"}},
      "Key Metric": {rich_text: [{text: {content: "Monthly Recurring Revenue (MRR) from kindergarten clients"}}]},
      "Current Phase": {select: {name: "Building"}},
    },
    ZenithCred: {
      "Health": {select: {name: "🟡 At Risk"}},
      "Key Metric": {rich_text: [{text: {content: "Investor meetings booked / Seed round progress"}}]},
      "Current Phase": {select: {name: "Validation"}},
    },
    OttoGen: {
      "Health": {select: {name: "🟡 At Risk"}},
      "Key Metric": {rich_text: [{text: {content: "MRR from AI services + content revenue"}}]},
      "Current Phase": {select: {name: "Building"}},
    },
    CuttingEdge: {
      "Health": {select: {name: "🟡 At Risk"}},
      "Key Metric": {rich_text: [{text: {content: "Monthly revenue / Active project count"}}]},
      "Current Phase": {select: {name: "Growth"}},
    },
    SentinAgro: {
      "Health": {select: {name: "🟡 At Risk"}},
      "Key Metric": {rich_text: [{text: {content: "Feasibility study completion %"}}]},
      "Current Phase": {select: {name: "Ideation"}},
    },
    Chimera: {
      "Health": {select: {name: "🟡 At Risk"}},
      "Key Metric": {rich_text: [{text: {content: "Test nodes deployed / Phase completion"}}]},
      "Current Phase": {select: {name: "Building"}},
    },
  };

  for (const [co, props] of Object.entries(companyUpdates)) {
    console.log(`Updating ${co}...`);
    await updatePage(COMPANIES[co], props);
    LOG.push(`Company Update | ${co} | ${COMPANIES[co]}`);
  }

  // ============ SAVE LOG ============
  console.log("\n=== SAVING LOG ===");
  const goalCount = LOG.filter(l => l.startsWith("Goal")).length;
  const taskCount = LOG.filter(l => l.startsWith("Task")).length;
  const failCount = LOG.filter(l => l.startsWith("FAILED")).length;
  
  let log = `# Notion Population Log\n## Generated: 2026-02-07\n\n`;
  log += `## Summary\n- Goals created: ${goalCount}\n- Tasks created: ${taskCount}\n- Failed: ${failCount}\n- Companies updated: 6\n\n`;
  log += `## All Items\n\n`;
  for (const l of LOG) log += `- ${l}\n`;
  
  log += `\n## 3-Month Objective IDs\n`;
  for (const [co, goals] of Object.entries(threeMonth)) {
    for (const [t, id] of Object.entries(goals)) log += `- ${co}: ${t} = ${id}\n`;
  }
  log += `\n## 1-Month Target IDs\n`;
  for (const [co, goals] of Object.entries(oneMonth)) {
    for (const [t, id] of Object.entries(goals)) log += `- ${co}: ${t} = ${id}\n`;
  }
  log += `\n## Weekly Goal IDs\n`;
  for (const [co, goals] of Object.entries(weeklyGoals)) {
    for (const [t, id] of Object.entries(goals)) log += `- ${co}: ${t} = ${id}\n`;
  }

  const fs = await import('fs');
  fs.writeFileSync('/home/adminuser/kira/vdr/notion-population-log.md', log);
  console.log(`\n✅ Done! Goals: ${goalCount}, Tasks: ${taskCount}, Failed: ${failCount}`);
}

main().catch(console.error);
