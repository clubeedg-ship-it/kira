#!/usr/bin/env node
/**
 * Generator-Critic-Refiner Loop
 * 
 * Usage:
 *   node critic-loop.js --task "Research 20 VCs in Benelux" --output ~/kira/vdr/output.md [--notion-task-id abc123] [--max-rounds 3] [--threshold 7]
 * 
 * Flow:
 *   1. GENERATOR agent produces work → output file
 *   2. CRITIC agent reviews against criteria → JSON score
 *   3. If score < threshold, REFINER agent improves → updated output
 *   4. Repeat critic/refine until score >= threshold or max rounds hit
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ─── CLI Args ───────────────────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { threshold: 7, maxRounds: 3 };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--task': opts.task = args[++i]; break;
      case '--output': opts.output = args[++i]; break;
      case '--notion-task-id': opts.notionTaskId = args[++i]; break;
      case '--max-rounds': opts.maxRounds = parseInt(args[++i], 10); break;
      case '--threshold': opts.threshold = parseInt(args[++i], 10); break;
      case '--skip-generate': opts.skipGenerate = true; break;
      case '--model': opts.model = args[++i]; break;
      default: break;
    }
  }
  if (!opts.task) { console.error('ERROR: --task required'); process.exit(1); }
  if (!opts.output) { console.error('ERROR: --output required'); process.exit(1); }
  // Expand ~ in output path
  opts.output = opts.output.replace(/^~/, process.env.HOME);
  return opts;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const CRITIC_PROMPT_PATH = path.join(__dirname, 'critic-prompt.md');
const CRITIC_LOG = path.join(process.env.HOME, 'clawd/memory/critic-log.md');
const TIMEOUT = 600; // 10 min per agent call

function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

function runAgent(message, timeoutSec = TIMEOUT) {
  try {
    const result = execSync(
      `openclaw agent --local --session-id critic-loop-$$ --timeout ${timeoutSec} -m ${shellEscape(message)}`,
      { encoding: 'utf-8', timeout: (timeoutSec + 30) * 1000, maxBuffer: 10 * 1024 * 1024 }
    );
    return result.trim();
  } catch (err) {
    log(`Agent call failed: ${err.message}`);
    return null;
  }
}

function shellEscape(str) {
  return "'" + str.replace(/'/g, "'\\''") + "'";
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function appendCriticLog(entry) {
  ensureDir(CRITIC_LOG);
  const ts = new Date().toISOString();
  const logEntry = `\n---\n### ${ts}\n**Task:** ${entry.task}\n**Round:** ${entry.round}\n**Score:** ${entry.score}/10\n**Summary:** ${entry.summary}\n**Output:** ${entry.outputPath}\n`;
  fs.appendFileSync(CRITIC_LOG, logEntry);
}

function extractJSON(text) {
  // Try to find JSON block in agent output
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*"overall_score"[\s\S]*\})/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[1].trim());
  } catch {
    // Try to find just the JSON object
    const braceMatch = text.match(/\{[\s\S]*"overall_score"[\s\S]*?\}/);
    if (braceMatch) {
      try { return JSON.parse(braceMatch[0]); } catch { return null; }
    }
    return null;
  }
}

// ─── Notion Integration ─────────────────────────────────────────────────────
function updateNotionTask(taskId, status, note) {
  if (!taskId) return;
  try {
    const apiKeyPath = path.join(process.env.HOME, '.config/notion/api_key');
    if (!fs.existsSync(apiKeyPath)) { log('Notion API key not found, skipping update'); return; }
    const apiKey = fs.readFileSync(apiKeyPath, 'utf-8').trim();
    
    const body = JSON.stringify({
      properties: {
        Status: { status: { name: status } },
        ...(note ? { Notes: { rich_text: [{ text: { content: note.slice(0, 2000) } }] } } : {})
      }
    });
    
    execSync(`curl -s -X PATCH "https://api.notion.com/v1/pages/${taskId}" \
      -H "Authorization: Bearer ${apiKey}" \
      -H "Content-Type: application/json" \
      -H "Notion-Version: 2022-06-28" \
      -d ${shellEscape(body)}`, { encoding: 'utf-8', timeout: 15000 });
    log(`Notion task ${taskId} updated to: ${status}`);
  } catch (err) {
    log(`Notion update failed: ${err.message}`);
  }
}

// ─── Main Loop ──────────────────────────────────────────────────────────────
async function main() {
  const opts = parseArgs();
  log(`Starting critic loop: "${opts.task}"`);
  log(`Output: ${opts.output} | Threshold: ${opts.threshold} | Max rounds: ${opts.maxRounds}`);
  
  ensureDir(opts.output);

  // Update Notion to "In Progress"
  updateNotionTask(opts.notionTaskId, 'In Progress', 'Critic loop started');

  // ── Step 1: GENERATE ──────────────────────────────────────────────────
  if (!opts.skipGenerate) {
    log('GENERATOR: Spawning producer agent...');
    const genPrompt = `You are a research/work agent. Complete this task thoroughly and output ONLY the deliverable content (no meta-commentary).

TASK: ${opts.task}

Write the complete deliverable. Be thorough, specific, and actionable. Output as clean markdown.`;
    
    const genResult = runAgent(genPrompt);
    if (!genResult) {
      log('GENERATOR FAILED — aborting');
      updateNotionTask(opts.notionTaskId, 'Blocked', 'Generator agent failed');
      process.exit(1);
    }
    fs.writeFileSync(opts.output, genResult);
    log(`GENERATOR: Output written to ${opts.output}`);
  } else {
    if (!fs.existsSync(opts.output)) {
      log(`ERROR: --skip-generate but output file doesn't exist: ${opts.output}`);
      process.exit(1);
    }
    log('GENERATOR: Skipped (using existing output)');
  }

  // ── Steps 2-4: CRITIC-REFINE LOOP ────────────────────────────────────
  let round = 0;
  let lastScore = 0;
  let lastCritique = null;

  while (round < opts.maxRounds) {
    round++;
    log(`CRITIC: Round ${round}/${opts.maxRounds}...`);

    const currentOutput = fs.readFileSync(opts.output, 'utf-8');
    
    // Load critic prompt template
    const criticTemplate = fs.readFileSync(CRITIC_PROMPT_PATH, 'utf-8');
    const criticPrompt = criticTemplate
      .replace('{{TASK_DESCRIPTION}}', opts.task)
      .replace('{{DELIVERABLE_CONTENT}}', currentOutput.slice(0, 50000)); // Cap at 50k chars

    const criticResult = runAgent(criticPrompt);
    if (!criticResult) {
      log('CRITIC FAILED — using current output as-is');
      break;
    }

    // Parse critic JSON
    const critique = extractJSON(criticResult);
    if (!critique || typeof critique.overall_score !== 'number') {
      log('CRITIC: Could not parse score from response. Raw output saved.');
      // Save raw critique anyway
      const critiquePath = opts.output.replace(/\.md$/, '') + '.critique.md';
      fs.writeFileSync(critiquePath, criticResult);
      break;
    }

    lastScore = critique.overall_score;
    lastCritique = critique;
    log(`CRITIC: Score ${lastScore}/10 — ${critique.summary || 'No summary'}`);

    // Log to critic-log.md
    appendCriticLog({
      task: opts.task,
      round,
      score: lastScore,
      summary: critique.summary || '',
      outputPath: opts.output
    });

    // Check if we pass the threshold
    if (lastScore >= opts.threshold) {
      log(`PASSED: Score ${lastScore} >= threshold ${opts.threshold}`);
      break;
    }

    // ── REFINE ──────────────────────────────────────────────────────────
    if (round >= opts.maxRounds) {
      log(`MAX ROUNDS reached. Shipping with score ${lastScore}.`);
      break;
    }

    log(`REFINER: Score ${lastScore} < ${opts.threshold}, refining...`);
    const refinePrompt = `You are a REFINER agent. You must improve a deliverable based on critic feedback.

ORIGINAL TASK: ${opts.task}

CURRENT DELIVERABLE:
${currentOutput.slice(0, 40000)}

CRITIC FEEDBACK (score: ${lastScore}/10):
${JSON.stringify(critique, null, 2)}

INSTRUCTIONS:
- Address EVERY improvement suggestion from the critic
- Keep what's already good
- Output ONLY the improved deliverable (no meta-commentary)
- Be thorough, specific, and actionable`;

    const refineResult = runAgent(refinePrompt);
    if (!refineResult) {
      log('REFINER FAILED — keeping current version');
      break;
    }

    fs.writeFileSync(opts.output, refineResult);
    log(`REFINER: Updated output written`);
  }

  // ── Save final critique alongside output ──────────────────────────────
  if (lastCritique) {
    const critiquePath = opts.output.replace(/\.md$/, '') + '.critique.json';
    fs.writeFileSync(critiquePath, JSON.stringify(lastCritique, null, 2));
    log(`Final critique saved to ${critiquePath}`);
  }

  // ── Update Notion ─────────────────────────────────────────────────────
  const finalStatus = lastScore >= opts.threshold ? 'Done' : 'Review';
  const note = `Critic loop: score ${lastScore}/${opts.threshold} after ${round} round(s)`;
  updateNotionTask(opts.notionTaskId, finalStatus, note);

  log(`DONE: Final score ${lastScore}/10, ${round} round(s). Output: ${opts.output}`);
  process.exit(lastScore >= opts.threshold ? 0 : 1);
}

main().catch(err => {
  log(`FATAL: ${err.message}`);
  process.exit(2);
});
