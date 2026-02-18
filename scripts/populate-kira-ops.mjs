const API_KEY = "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";
const HEADERS = {
  "Authorization": `Bearer ${API_KEY}`,
  "Notion-Version": "2025-09-03",
  "Content-Type": "application/json"
};
const GOALS_DB = "2fba6c94-88ca-8102-afb2-cae874f281bd";
const TASKS_DS = "300a6c94-88ca-81d4-bc85-000b82bb9a85";
const VISION_ID = "300a6c94-88ca-8123-a640-c34bb495d2d7";
const KIRA_OPS_ID = "300a6c94-88ca-81c5-9981-e31751817af6";
const LOG = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function api(method, url, body) {
  for (let i = 0; i < 3; i++) {
    const opts = { method, headers: HEADERS };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(url, opts);
    if (r.status === 429) { await sleep(parseFloat(r.headers.get("Retry-After")||"1")*1000); continue; }
    const j = await r.json();
    if (r.status >= 400) { console.log(`  ERR ${r.status}: ${JSON.stringify(j).slice(0,200)}`); if(i<2){await sleep(1000);continue;} return null; }
    return j;
  }
  return null;
}

async function createGoal(title, level, parentGoal, dueDate, keyResults="", whyMatters="", owner="Otto") {
  const props = {
    "Goal": {title:[{text:{content:title}}]},
    "Level": {select:{name:level}},
    "Status": {select:{name:"Not Started"}},
    "Company": {relation:[{id:KIRA_OPS_ID}]},
  };
  if (parentGoal) props["Parent Goal"] = {relation:[{id:parentGoal}]};
  if (dueDate) props["Due Date"] = {date:{start:dueDate}};
  if (keyResults) props["Key Results"] = {rich_text:[{text:{content:keyResults.slice(0,2000)}}]};
  if (whyMatters) props["Why This Matters"] = {rich_text:[{text:{content:whyMatters.slice(0,2000)}}]};
  if (owner) props["Owner"] = {select:{name:owner}};
  const r = await api("POST","https://api.notion.com/v1/pages",{parent:{database_id:GOALS_DB},properties:props});
  await sleep(350);
  if(r){console.log(`  ✅ ${level}: ${title} -> ${r.id}`);LOG.push(`${level} | ${title} | ${r.id}`);return r.id;}
  console.log(`  ❌ ${title}`);LOG.push(`FAILED | ${title}`);return null;
}

async function createTask(title, goalId, priority, assignee, dueDate, effort) {
  const props = {
    "Task": {title:[{text:{content:title}}]},
    "Priority": {select:{name:priority}},
    "Status": {select:{name:"Todo"}},
    "Assignee": {select:{name:assignee}},
    "Company": {relation:[{id:KIRA_OPS_ID}]},
    "Due Date": {date:{start:dueDate}},
    "Effort": {select:{name:effort}},
  };
  if(goalId) props["Goal"]={relation:[{id:goalId}]};
  const r = await api("POST","https://api.notion.com/v1/pages",{parent:{data_source_id:TASKS_DS},properties:props});
  await sleep(350);
  if(r){console.log(`  ✅ Task: ${title} -> ${r.id}`);LOG.push(`Task | ${title} | ${r.id}`);return r.id;}
  console.log(`  ❌ Task: ${title}`);LOG.push(`FAILED Task | ${title}`);return null;
}

async function main(){
  // 1. Create 6-month goal
  console.log("=== 6-MONTH GOAL ===");
  const sixMonth = await createGoal(
    "Kira at 99% autonomy — self-healing, self-improving AI ops",
    "📅 6-Month Goal", VISION_ID, "2026-08-01",
    "Memory system stable, producer/critic loops running, 99%+ cron reliability, self-healing agents",
    "FINANCIAL TARGET: Kira Ops is infrastructure — reduces Otto's operational load by 80%, enabling focus on revenue-generating activities across all ventures. Value: €500K+ in saved founder time."
  );

  // 2. 3-month objectives
  console.log("\n=== 3-MONTH OBJECTIVES ===");
  const obj3m = {};
  const objectives = [
    ["Complete memory system (graph + retrieval + curation)", "Memory daemon processing all sessions, graph DB with 1000+ facts, auto-retrieval on compaction"],
    ["Build producer/critic agent loops", "At least 3 producer/critic pairs running: code review, content generation, research. Self-correcting output quality."],
    ["Achieve 90%+ cron reliability", "All crons running 90%+ success rate, auto-restart on failure, alerting on missed runs"],
  ];
  for(const [t,kr] of objectives){
    obj3m[t] = await createGoal(t,"🗓️ 3-Month Objective",sixMonth,"2026-04-30",kr);
  }

  // 3. 1-month targets
  console.log("\n=== 1-MONTH TARGETS ===");
  const tgt1m = {};
  const targets = [
    ["Memory daemon processing all sessions", objectives[0][0], "Daemon auto-runs on session end, extracts facts, stores to graph DB, retrieval working on compaction\n\nFinancial: €0 — pure infrastructure investment"],
    ["First critic loop deployed", objectives[1][0], "One producer/critic pair live (e.g. code review critic), measurable quality improvement\n\nFinancial: Reduces error rate, saves debugging time"],
    ["All 7 crons tested and monitored", objectives[2][0], "7 cron jobs running, health dashboard, auto-restart scripts, <10% failure rate\n\nFinancial: Reliability = trust = more delegation to Kira"],
  ];
  for(const [t,parentTitle,kr] of targets){
    const parentId = obj3m[parentTitle] || sixMonth;
    tgt1m[t] = await createGoal(t,"📋 1-Month Target",parentId,"2026-02-28",kr);
  }

  // 4. Weekly goals
  console.log("\n=== WEEKLY GOALS ===");
  const w1 = await createGoal("W1: Memory system testing + cron audit","🏃 Weekly Sprint",
    tgt1m["Memory daemon processing all sessions"]||sixMonth,"2026-02-14");
  const w2 = await createGoal("W2: Critic loop prototype + cron fixes","🏃 Weekly Sprint",
    tgt1m["First critic loop deployed"]||sixMonth,"2026-02-21");

  // 5. Tasks
  console.log("\n=== TASKS ===");
  const tasks = [
    ["Audit all 7 cron jobs — check last run, success rate", w1, "P0", "Kira", "2026-02-10", "M"],
    ["Fix memory daemon session detection bug", w1, "P1", "Kira", "2026-02-10", "M"],
    ["Write integration tests for memory graph queries", w1, "P1", "Kira", "2026-02-11", "L"],
    ["Design producer/critic loop architecture doc", w1, "P1", "Otto", "2026-02-11", "M"],
    ["Implement cron health monitoring dashboard", w1, "P2", "Kira", "2026-02-12", "L"],
    ["Test memory retrieval after context compaction", w1, "P1", "Kira", "2026-02-12", "M"],
    ["Prototype first critic agent (code review)", w1, "P2", "Kira", "2026-02-13", "L"],
    ["Document memory system architecture in whitepaper format", w1, "P2", "Kira", "2026-02-14", "M"],
  ];
  for(const [t,g,p,a,d,e] of tasks) await createTask(t,g,p,a,d,e);

  // 6. Update company page
  console.log("\n=== UPDATE COMPANY ===");
  const r = await api("PATCH",`https://api.notion.com/v1/pages/${KIRA_OPS_ID}`,{properties:{
    "Health":{select:{name:"🟡 At Risk"}},
    "Key Metric":{rich_text:[{text:{content:"Cron reliability % / Memory facts stored / Agent loops active"}}]},
    "Current Phase":{select:{name:"Building"}},
  }});
  if(r){console.log("  ✅ Company updated");LOG.push(`Company Update | Kira Ops | ${KIRA_OPS_ID}`);}

  // Save log
  const fs = await import('fs');
  const existing = fs.readFileSync('/home/adminuser/kira/vdr/notion-population-log.md','utf8');
  const addition = `\n\n## Kira Ops Addition (${new Date().toISOString()})\n\n` +
    LOG.map(l=>`- ${l}`).join('\n') + '\n';
  fs.writeFileSync('/home/adminuser/kira/vdr/notion-population-log.md', existing + addition);
  
  const failed = LOG.filter(l=>l.startsWith("FAILED")).length;
  console.log(`\n✅ Done! Items: ${LOG.length}, Failed: ${failed}`);
}
main().catch(console.error);
