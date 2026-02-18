#!/usr/bin/env node
/**
 * Living VDR Agent v2 — Analyse/Execute Split Architecture
 * 
 * Two modes:
 *   --analyse   Scan VDR files, generate analysis report with questions & proposals
 *   --execute   Apply approved proposals from analysis report to Notion
 *   --auto      Analyse + auto-execute (for cron, no questions — uses conservative defaults)
 * 
 * The analyse phase:
 * - Scans all .md files in ~/kira/vdr/
 * - Detects new/changed files
 * - Extracts actionable items with BuJo classification
 * - Identifies gaps, contradictions, stale info
 * - Generates questions for human review
 * - Writes report to ~/kira/vdr/.vdr-analysis-report.json
 * 
 * The execute phase:
 * - Reads the analysis report
 * - Creates/updates tasks in Notion with full BuJo signifiers
 * - Marks stale tasks
 * - Logs all changes
 * 
 * BuJo Signifiers (applied to all tasks):
 * - Status: • Todo, ○ In Progress, ✕ Done, < Scheduled, > Migrated, — Cancelled
 * - Signifier: ★ Priority, ! Inspiration, 👁 Explore, ⚡ Quick Win, 🔒 Blocked
 * - Type: Task, Event, Note, Milestone, Question
 * - Source: VDR Agent, Kira, Otto, Manual
 * - Plus existing: Priority, Effort, Assignee, Company, Project, Due Date, Notes
 */

const fs = require('fs');
const path = require('path');

const VDR_DIR = path.join(process.env.HOME, 'kira/vdr');
const STATE_PATH = path.join(process.env.HOME, 'kira/scripts/.living-vdr-state.json');
const REPORT_PATH = path.join(VDR_DIR, '.vdr-analysis-report.json');
const QUESTIONS_PATH = path.join(VDR_DIR, '.vdr-questions.md');
const API_KEY = fs.readFileSync(path.join(process.env.HOME, '.config/notion/api_key'), 'utf8').trim();
const NOTION_VERSION = '2022-06-28';

const IDS = JSON.parse(fs.readFileSync(path.join(process.env.HOME, 'kira/scripts/workflows/notion-ids.json'), 'utf8'));
const TASKS_DB = IDS.tasks;

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
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) results.push(...findFiles(full));
      else if (entry.name.endsWith('.md')) results.push(full);
    }
  } catch {}
  return results;
}

function detectCompany(filePath) {
  const rel = path.relative(VDR_DIR, filePath);
  const folder = rel.split(path.sep)[0]?.toLowerCase();
  return COMPANY_MAP[folder] || null;
}

// ─── BuJo Classification ───

function classifyAction(text, context = {}) {
  const t = text.toLowerCase();
  
  // Type detection
  let type = 'Task';
  if (/\?$|question|unclear|need to (ask|clarify|confirm)|tbd/i.test(text)) type = 'Question';
  else if (/milestone|launch|release|deadline|go-live/i.test(text)) type = 'Milestone';
  else if (/note:|fyi|context:|background:/i.test(text)) type = 'Note';
  else if (/meeting|call|event|webinar|workshop|session/i.test(text)) type = 'Event';
  
  // Signifier detection
  let signifier = null;
  if (/urgent|critical|asap|blocker|blocking/i.test(text)) signifier = '★ Priority';
  else if (/block|wait|depend|need.*first|after.*done/i.test(text)) signifier = '🔒 Blocked';
  else if (/idea|could|maybe|explore|research|investigate/i.test(text)) signifier = '👁 Explore';
  else if (/inspir|vision|dream|future|someday/i.test(text)) signifier = '! Inspiration';
  else if (/quick|easy|simple|5.?min|low.?effort/i.test(text)) signifier = '⚡ Quick Win';
  
  // Priority
  let priority = 'Medium';
  if (/urgent|critical|asap|p0|p1|high.?prio/i.test(text)) priority = 'High';
  else if (/low.?prio|nice.?to|someday|backlog/i.test(text)) priority = 'Low';
  else if (/revenue|funding|investor|client|money|payment/i.test(text)) priority = 'High';
  
  // Effort
  let effort = null;
  if (/5.?min|quick|trivial|easy/i.test(text)) effort = 'XS';
  else if (/hour|small|simple/i.test(text)) effort = 'S';
  else if (/day|medium|moderate/i.test(text)) effort = 'M';
  else if (/week|large|complex|major/i.test(text)) effort = 'L';
  else if (/month|epic|massive|huge/i.test(text)) effort = 'XL';
  
  // Assignee detection
  let assignee = 'Kira';
  if (/otto|human|manual|hands.?on|physical/i.test(text)) assignee = 'Otto';
  
  return { type, signifier, priority, effort, assignee };
}

// ─── Analysis: Gap & Contradiction Detection ───

function analyseDocument(filePath, content) {
  const rel = path.relative(VDR_DIR, filePath);
  const lines = content.split('\n');
  const company = detectCompany(filePath);
  
  const findings = {
    file: rel,
    company: company?.name || 'Unknown',
    actions: [],
    questions: [],
    gaps: [],
    staleIndicators: [],
  };
  
  // Extract actions with BuJo classification
  const patterns = [
    /^[-*]\s*\[[ ]\]\s+(.+)/i,
    /(?:TODO|FIXME|ACTION|NEXT STEP)[:\s]+(.+)/i,
    /^[-*]\s+(?:Action|Next step|Recommendation|To-do)[:\s]+(.+)/i,
  ];
  
  let inActionSection = false;
  let currentSection = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (/^#{1,4}\s+/.test(line)) {
      currentSection = line.replace(/^#+\s+/, '');
      inActionSection = /next steps?|action items?|recommendations?|to-?dos?|tasks?/i.test(currentSection);
      continue;
    }
    
    let matched = false;
    for (const pat of patterns) {
      const m = line.match(pat);
      if (m) {
        const text = m[1].trim();
        const bujo = classifyAction(text, { section: currentSection, company: company?.name });
        findings.actions.push({ text, line: i + 1, section: currentSection, ...bujo });
        matched = true;
        break;
      }
    }
    
    if (!matched && inActionSection && /^[-*]\s+(.{10,})/.test(line)) {
      const m = line.match(/^[-*]\s+(.+)/);
      if (m) {
        const text = m[1].trim();
        const bujo = classifyAction(text, { section: currentSection });
        findings.actions.push({ text, line: i + 1, section: currentSection, ...bujo });
      }
    }
    
    // Detect questions/ambiguity
    if (/\?\s*$/.test(line) && line.length > 15) {
      findings.questions.push({ text: line.trim(), line: i + 1, section: currentSection });
    }
    
    // Detect gaps: "TBD", "TODO", empty sections, placeholder text
    if (/\bTBD\b|\bTBC\b|\[.*\.\.\.\]|\bPENDING\b|\bNEED\b.*\bINPUT\b/i.test(line)) {
      findings.gaps.push({ text: line.trim(), line: i + 1, section: currentSection, type: 'placeholder' });
    }
    
    // Detect stale dates
    const dateMatch = line.match(/\b(202[0-5])-(\d{2})-(\d{2})\b/);
    if (dateMatch) {
      const date = new Date(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`);
      const now = new Date();
      const daysDiff = (now - date) / (1000 * 60 * 60 * 24);
      if (daysDiff > 30) {
        findings.staleIndicators.push({
          text: `Date ${dateMatch[0]} is ${Math.floor(daysDiff)} days old`,
          line: i + 1,
          section: currentSection,
        });
      }
    }
  }
  
  // Check for missing sections
  const hasOverview = /^#\s+|^##?\s+(?:overview|summary|about)/im.test(content);
  const hasNextSteps = /^##?\s+(?:next steps?|action items?)/im.test(content);
  const hasStatus = /^##?\s+(?:status|progress|current state)/im.test(content);
  
  if (!hasOverview) findings.gaps.push({ type: 'missing_section', text: 'No overview/summary section' });
  if (!hasNextSteps) findings.gaps.push({ type: 'missing_section', text: 'No next steps section' });
  if (!hasStatus && content.length > 500) findings.gaps.push({ type: 'missing_section', text: 'No status/progress section' });
  
  return findings;
}

// ─── Cross-Document Analysis ───

function crossAnalyse(allFindings) {
  const questions = [];
  
  // Check for duplicate/conflicting tasks across files
  const allActions = [];
  for (const f of allFindings) {
    for (const a of f.actions) {
      allActions.push({ ...a, file: f.file, company: f.company });
    }
  }
  
  // Find similar tasks across different files
  for (let i = 0; i < allActions.length; i++) {
    for (let j = i + 1; j < allActions.length; j++) {
      const a = allActions[i], b = allActions[j];
      if (a.file === b.file) continue;
      const similarity = textSimilarity(a.text, b.text);
      if (similarity > 0.6) {
        questions.push({
          type: 'duplicate',
          text: `Possible duplicate task across files:\n  • "${a.text}" (${a.file})\n  • "${b.text}" (${b.file})`,
          severity: 'medium',
        });
      }
    }
  }
  
  // Check for company coverage gaps
  const companiesWithDocs = new Set(allFindings.map(f => f.company).filter(Boolean));
  for (const [key, val] of Object.entries(COMPANY_MAP)) {
    if (!companiesWithDocs.has(val.name)) {
      questions.push({
        type: 'coverage_gap',
        text: `No VDR documents found for ${val.name}`,
        severity: 'low',
      });
    }
  }
  
  return questions;
}

function textSimilarity(a, b) {
  const wordsA = new Set(a.toLowerCase().split(/\W+/).filter(w => w.length > 3));
  const wordsB = new Set(b.toLowerCase().split(/\W+/).filter(w => w.length > 3));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  for (const w of wordsA) if (wordsB.has(w)) overlap++;
  return overlap / Math.max(wordsA.size, wordsB.size);
}

// ─── ANALYSE MODE ───

async function runAnalyse() {
  console.log('🔍 VDR Agent v2 — ANALYSE mode');
  
  let state = {};
  try { state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')); } catch {}
  
  const files = findFiles(VDR_DIR);
  console.log(`📁 Found ${files.length} VDR files`);
  
  // Detect changed files
  const changed = [];
  const newState = {};
  for (const f of files) {
    const mtime = fs.statSync(f).mtimeMs;
    const rel = path.relative(VDR_DIR, f);
    newState[rel] = mtime;
    if (!state[rel] || state[rel] < mtime) changed.push(f);
  }
  
  // Analyse ALL files (not just changed) for cross-referencing, but mark which are new
  const allFindings = [];
  for (const f of files) {
    const content = fs.readFileSync(f, 'utf8');
    const finding = analyseDocument(f, content);
    finding.isNew = changed.includes(f);
    allFindings.push(finding);
  }
  
  const crossQuestions = crossAnalyse(allFindings);
  
  // Build report
  const report = {
    timestamp: new Date().toISOString(),
    totalFiles: files.length,
    changedFiles: changed.length,
    findings: allFindings,
    crossQuestions,
    newState,
    stats: {
      totalActions: allFindings.reduce((n, f) => n + f.actions.length, 0),
      totalQuestions: allFindings.reduce((n, f) => n + f.questions.length, 0) + crossQuestions.length,
      totalGaps: allFindings.reduce((n, f) => n + f.gaps.length, 0),
      totalStale: allFindings.reduce((n, f) => n + f.staleIndicators.length, 0),
    },
  };
  
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  
  // Generate human-readable questions file
  const md = generateQuestionsMarkdown(report);
  fs.writeFileSync(QUESTIONS_PATH, md);
  
  console.log(`\n📊 Analysis complete:`);
  console.log(`   Actions found: ${report.stats.totalActions}`);
  console.log(`   Questions: ${report.stats.totalQuestions}`);
  console.log(`   Gaps: ${report.stats.totalGaps}`);
  console.log(`   Stale indicators: ${report.stats.totalStale}`);
  console.log(`\n📝 Report: ${REPORT_PATH}`);
  console.log(`❓ Questions: ${QUESTIONS_PATH}`);
  
  return report;
}

function generateQuestionsMarkdown(report) {
  const lines = [
    '# VDR Analysis Questions',
    `*Generated: ${report.timestamp}*`,
    `*Files: ${report.totalFiles} total, ${report.changedFiles} changed*`,
    '',
  ];
  
  // Gaps
  const allGaps = report.findings.flatMap(f => f.gaps.map(g => ({ ...g, file: f.file })));
  if (allGaps.length > 0) {
    lines.push('## 🕳️ Gaps & Missing Info');
    for (const g of allGaps) {
      lines.push(`- **${g.file}** (L${g.line || '?'}): ${g.text}`);
    }
    lines.push('');
  }
  
  // Questions from docs
  const allQ = report.findings.flatMap(f => f.questions.map(q => ({ ...q, file: f.file })));
  if (allQ.length > 0) {
    lines.push('## ❓ Open Questions in Documents');
    for (const q of allQ) {
      lines.push(`- **${q.file}** (L${q.line}): ${q.text}`);
    }
    lines.push('');
  }
  
  // Cross-doc questions
  if (report.crossQuestions.length > 0) {
    lines.push('## 🔀 Cross-Document Issues');
    for (const q of report.crossQuestions) {
      lines.push(`- [${q.severity}] ${q.text}`);
    }
    lines.push('');
  }
  
  // Stale indicators
  const allStale = report.findings.flatMap(f => f.staleIndicators.map(s => ({ ...s, file: f.file })));
  if (allStale.length > 0) {
    lines.push('## ⏰ Potentially Stale Information');
    for (const s of allStale) {
      lines.push(`- **${s.file}** (L${s.line}): ${s.text}`);
    }
    lines.push('');
  }
  
  // Proposed tasks
  const newActions = report.findings
    .filter(f => f.isNew)
    .flatMap(f => f.actions.map(a => ({ ...a, file: f.file, company: f.company })));
  
  if (newActions.length > 0) {
    lines.push('## 📋 Proposed New Tasks');
    lines.push('');
    lines.push('| # | Task | Type | Signifier | Priority | Effort | Company | Source |');
    lines.push('|---|------|------|-----------|----------|--------|---------|--------|');
    newActions.forEach((a, i) => {
      lines.push(`| ${i + 1} | ${a.text.slice(0, 60)} | ${a.type} | ${a.signifier || '—'} | ${a.priority} | ${a.effort || '—'} | ${a.company} | ${a.file} |`);
    });
    lines.push('');
  }
  
  return lines.join('\n');
}

// ─── EXECUTE MODE ───

async function runExecute({ autoMode = false } = {}) {
  console.log(`📥 VDR Agent v2 — EXECUTE mode ${autoMode ? '(auto)' : ''}`);
  
  let report;
  try {
    report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
  } catch {
    console.error('❌ No analysis report found. Run --analyse first.');
    process.exit(1);
  }
  
  // Check report age (don't execute stale reports in non-auto mode)
  const reportAge = Date.now() - new Date(report.timestamp).getTime();
  if (!autoMode && reportAge > 24 * 60 * 60 * 1000) {
    console.warn('⚠️  Report is >24h old. Run --analyse first for fresh data.');
  }
  
  // Get existing tasks for dedup
  console.log('📋 Fetching existing tasks...');
  const existingTasks = await getExistingTaskNames();
  console.log(`   ${existingTasks.size} existing tasks`);
  
  // Get Notion DB properties to know what fields exist
  let dbProps = {};
  try {
    const db = await notion(`https://api.notion.com/v1/databases/${TASKS_DB}`);
    dbProps = Object.keys(db.properties || {}).reduce((acc, k) => {
      acc[k.toLowerCase()] = { name: k, type: db.properties[k].type };
      return acc;
    }, {});
  } catch {}
  
  const newActions = report.findings
    .filter(f => f.isNew || autoMode)
    .flatMap(f => f.actions.map(a => ({ ...a, file: f.file, company: f.company, companyId: detectCompanyFromName(f.company)?.id })));
  
  let created = 0;
  const MAX = 50;
  
  for (const action of newActions) {
    if (created >= MAX) break;
    
    const taskName = action.text.length > 80 ? action.text.slice(0, 77) + '...' : action.text;
    if (existingTasks.has(taskName.toLowerCase())) continue;
    
    // Build properties with all available BuJo fields
    const properties = {
      Task: { title: [{ text: { content: taskName } }] },
    };
    
    // Only set properties that exist in the DB
    if (dbProps['assignee']) properties.Assignee = { select: { name: action.assignee || 'Kira' } };
    if (dbProps['priority']) properties.Priority = { select: { name: action.priority || 'Medium' } };
    if (dbProps['effort'] && action.effort) properties.Effort = { select: { name: action.effort } };
    if (dbProps['company'] && action.companyId) properties.Company = { relation: [{ id: action.companyId }] };
    if (dbProps['notes']) properties.Notes = { rich_text: [{ text: { content: `Source: ${action.file}\nSection: ${action.section || 'N/A'}\nLine: ${action.line || '?'}` } }] };
    
    // BuJo fields (only if they exist in DB)
    if (dbProps['status']) properties.Status = { select: { name: '• Todo' } };
    if (dbProps['type'] && action.type) properties.Type = { select: { name: action.type } };
    if (dbProps['signifier'] && action.signifier) properties.Signifier = { select: { name: action.signifier } };
    if (dbProps['source']) properties.Source = { select: { name: 'VDR Agent' } };
    
    try {
      await notion('https://api.notion.com/v1/pages', 'POST', {
        parent: { database_id: TASKS_DB },
        properties,
      });
      existingTasks.add(taskName.toLowerCase());
      created++;
      const sig = action.signifier ? ` [${action.signifier}]` : '';
      console.log(`   ✅ ${action.type}${sig} "${taskName}"`);
    } catch (e) {
      console.log(`   ❌ "${taskName}": ${e.message}`);
    }
  }
  
  // Save state after successful execute
  if (report.newState) {
    fs.writeFileSync(STATE_PATH, JSON.stringify(report.newState, null, 2));
  }
  
  console.log(`\n🎉 Execute complete! Created ${created} tasks.`);
  
  // Also create Question-type tasks for unresolved gaps
  if (autoMode) {
    let qCreated = 0;
    const gaps = report.findings
      .filter(f => f.isNew)
      .flatMap(f => f.gaps.filter(g => g.type === 'placeholder').map(g => ({ ...g, file: f.file, company: f.company })));
    
    for (const gap of gaps.slice(0, 10)) {
      const name = `❓ Clarify: ${gap.text.slice(0, 60)}`;
      if (existingTasks.has(name.toLowerCase())) continue;
      
      const properties = {
        Task: { title: [{ text: { content: name } }] },
      };
      if (dbProps['assignee']) properties.Assignee = { select: { name: 'Otto' } };
      if (dbProps['priority']) properties.Priority = { select: { name: 'Medium' } };
      if (dbProps['notes']) properties.Notes = { rich_text: [{ text: { content: `Gap found in: ${gap.file}\nLine: ${gap.line || '?'}` } }] };
      if (dbProps['status']) properties.Status = { select: { name: '• Todo' } };
      if (dbProps['type']) properties.Type = { select: { name: 'Question' } };
      if (dbProps['source']) properties.Source = { select: { name: 'VDR Agent' } };
      
      try {
        await notion('https://api.notion.com/v1/pages', 'POST', { parent: { database_id: TASKS_DB }, properties });
        qCreated++;
      } catch {}
    }
    
    if (qCreated > 0) console.log(`   📝 Created ${qCreated} question tasks for gaps`);
  }
}

function detectCompanyFromName(name) {
  for (const [, val] of Object.entries(COMPANY_MAP)) {
    if (val.name === name) return val;
  }
  return null;
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

// ─── MAIN ───

const args = process.argv.slice(2);
const mode = args.includes('--execute') ? 'execute'
  : args.includes('--auto') ? 'auto'
  : 'analyse'; // default to analyse

(async () => {
  if (mode === 'analyse') {
    await runAnalyse();
  } else if (mode === 'execute') {
    await runExecute();
  } else if (mode === 'auto') {
    await runAnalyse();
    await runExecute({ autoMode: true });
  }
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
