#!/usr/bin/env node
/**
 * Kira Self-Improvement Loop (DGM-lite)
 * Production-grade self-improving agent system.
 *
 * Usage:
 *   node index.js status                      Show system status
 *   node index.js log --task "..." --outcome success|failure|partial --category "..." [--duration 120] [--notes "..."]
 *   node index.js analyze [--days 7] [--min-failures 2]
 *   node index.js propose [--analysis-id <id>] [--model qwen3:14b]
 *   node index.js evaluate --proposal-id <id> [--runs 3]
 *   node index.js merge --proposal-id <id> [--dry-run]
 *   node index.js run                         Full cycle: analyze → propose → evaluate → merge
 *   node index.js archive [--list|--show <id>|--tree|--rollback <id>|--compare <id1> <id2>]
 *   node index.js tasks [--list|--seed|--add "..."]
 *   node index.js history [--days 30]         Show improvement history
 */

const { getDb, close } = require('./db');

// Parse CLI args
const args = process.argv.slice(2);
const command = args[0];

function getFlag(name, defaultValue) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return defaultValue;
  if (typeof defaultValue === 'boolean') return true;
  return args[idx + 1];
}

function getPositional(index) {
  return args[index];
}

async function main() {
  // Initialize DB on any command
  getDb();

  switch (command) {
    case 'status': {
      const { getStats } = require('./logger');
      const { getLatestAnalysis } = require('./analyzer');
      const { getProposals, getCurrentConfigHash } = require('./proposer');
      const { list: archiveList } = require('./archive');

      const stats = getStats(7);
      const analysis = getLatestAnalysis();
      const pending = getProposals('draft');
      const validated = getProposals('validated');
      const merged = getProposals('merged');
      const archive = archiveList(5);

      console.log('═══════════════════════════════════════');
      console.log('  KIRA SELF-IMPROVEMENT LOOP — STATUS');
      console.log('═══════════════════════════════════════');
      console.log(`\nConfig hash: ${getCurrentConfigHash()}`);
      console.log(`\n📊 Last 7 days:`);
      console.log(`  Tasks logged: ${stats.total}`);
      console.log(`  Outcomes: ${JSON.stringify(stats.outcomes)}`);
      console.log(`  Failure rate: ${stats.failure_rate}`);

      if (analysis) {
        console.log(`\n🔍 Latest analysis (#${analysis.id}, ${analysis.timestamp}):`);
        console.log(`  Period: ${analysis.period_days} days, ${analysis.total_tasks} tasks`);
        console.log(`  Patterns: ${analysis.patterns.length} found`);
        console.log(`  Focus areas: ${analysis.focus_areas.map(f => f.category).join(', ') || 'none'}`);
      } else {
        console.log('\n🔍 No analyses yet. Run: node index.js analyze');
      }

      console.log(`\n📝 Proposals:`);
      console.log(`  Draft: ${pending.length}`);
      console.log(`  Validated (ready to merge): ${validated.length}`);
      console.log(`  Merged (total): ${merged.length}`);

      console.log(`\n🗄️  Archive: ${archive.length} entries`);
      for (const a of archive.slice(0, 3)) {
        console.log(`  #${a.id}: ${a.description?.slice(0, 50) || 'no description'} (${a.timestamp})`);
      }

      console.log('\n═══════════════════════════════════════');
      break;
    }

    case 'log': {
      const { logTask } = require('./logger');
      const task = getFlag('task');
      const outcome = getFlag('outcome');
      const category = getFlag('category');
      const duration = getFlag('duration');
      const notes = getFlag('notes');
      const sessionKey = getFlag('session-key');

      if (!task || !outcome || !category) {
        console.error('Usage: node index.js log --task "..." --outcome success|failure|partial --category "..."');
        process.exit(1);
      }

      logTask({
        task, outcome, category,
        duration: duration ? parseInt(duration) : undefined,
        notes,
        sessionKey
      });
      break;
    }

    case 'analyze': {
      const { analyze } = require('./analyzer');
      const days = parseInt(getFlag('days', '7'));
      const minFailures = parseInt(getFlag('min-failures', '2'));

      const result = analyze({ days, minFailures });
      if (result) {
        console.log(`\nPatterns: ${JSON.stringify(result.patterns, null, 2)}`);
        console.log(`\nFocus areas: ${JSON.stringify(result.focus_areas, null, 2)}`);
      }
      break;
    }

    case 'propose': {
      const { propose } = require('./proposer');
      const analysisId = getFlag('analysis-id');
      const model = getFlag('model', 'qwen3:14b');

      const proposals = propose({
        analysisId: analysisId ? parseInt(analysisId) : undefined,
        model
      });

      if (proposals.length > 0) {
        console.log(`\nCreated ${proposals.length} proposals:`);
        for (const p of proposals) {
          console.log(`  #${p.id}: ${p.description.slice(0, 80)} [${p.risk} risk]`);
        }
      }
      break;
    }

    case 'evaluate': {
      const { evaluate } = require('./evaluator');
      const proposalId = getFlag('proposal-id');
      const runs = parseInt(getFlag('runs', '3'));

      if (!proposalId) {
        console.error('Usage: node index.js evaluate --proposal-id <id> [--runs 3]');
        process.exit(1);
      }

      const result = evaluate({ proposalId: parseInt(proposalId), runs });
      console.log(`\nResult: ${result.passed ? 'PASSED ✅' : 'FAILED ❌'}`);
      if (result.improvement_pct !== undefined) {
        console.log(`Improvement: ${result.improvement_pct.toFixed(1)}%`);
      }
      break;
    }

    case 'merge': {
      const { merge } = require('./merger');
      const proposalId = getFlag('proposal-id');
      const dryRun = getFlag('dry-run', false);

      if (!proposalId) {
        console.error('Usage: node index.js merge --proposal-id <id> [--dry-run]');
        process.exit(1);
      }

      const result = merge({ proposalId: parseInt(proposalId), dryRun });
      if (result.success) {
        console.log(`\n${dryRun ? 'DRY RUN — ' : ''}Merge successful.`);
        console.log(`Files: ${result.files.join(', ')}`);
      } else {
        console.error(`\nMerge failed: ${result.error}`);
      }
      break;
    }

    case 'run': {
      // Full cycle: analyze → propose → evaluate → merge
      console.log('═══════════════════════════════════════');
      console.log('  FULL IMPROVEMENT CYCLE');
      console.log('═══════════════════════════════════════');

      const { analyze } = require('./analyzer');
      const { propose } = require('./proposer');
      const { evaluate } = require('./evaluator');
      const { merge } = require('./merger');

      // Step 1: Analyze
      console.log('\n📊 Step 1: Analyzing task outcomes...');
      const days = parseInt(getFlag('days', '7'));
      const analysis = analyze({ days, minFailures: 2 });

      if (!analysis || analysis.patterns.length === 0) {
        console.log('No actionable patterns. System is performing well. ✅');
        break;
      }

      // Step 2: Propose
      console.log('\n💡 Step 2: Generating improvement proposals...');
      const model = getFlag('model', 'qwen3:14b');
      const proposals = propose({ analysisId: analysis.id, model });

      if (proposals.length === 0) {
        console.log('No proposals generated. Nothing to improve right now.');
        break;
      }

      // Step 3: Evaluate each proposal
      console.log('\n🧪 Step 3: Evaluating proposals...');
      const validated = [];
      for (const p of proposals) {
        try {
          const result = evaluate({ proposalId: p.id, runs: 1 });
          if (result.passed) validated.push(p);
        } catch (err) {
          console.error(`  Proposal #${p.id} evaluation failed: ${err.message}`);
        }
      }

      if (validated.length === 0) {
        console.log('No proposals passed evaluation. Cycle complete.');
        break;
      }

      // Step 4: Merge validated proposals (low risk only auto-merge)
      console.log('\n🔀 Step 4: Merging validated proposals...');
      for (const p of validated) {
        const proposal = require('./proposer').getProposal(p.id);
        if (proposal.risk === 'low') {
          try {
            merge({ proposalId: p.id });
            console.log(`  ✅ Auto-merged proposal #${p.id} (low risk)`);
          } catch (err) {
            console.error(`  ❌ Merge failed for #${p.id}: ${err.message}`);
          }
        } else {
          console.log(`  ⏸️  Proposal #${p.id} is ${proposal.risk} risk — requires manual merge`);
        }
      }

      console.log('\n═══════════════════════════════════════');
      console.log('  CYCLE COMPLETE');
      console.log('═══════════════════════════════════════');
      break;
    }

    case 'archive': {
      const archive = require('./archive');

      if (getFlag('tree', false)) {
        const tree = archive.getTree();
        console.log(`Archive tree: ${tree.total} entries`);
        function printTree(nodes, indent = 0) {
          for (const n of nodes) {
            console.log(`${'  '.repeat(indent)}#${n.id}: ${n.description?.slice(0, 50) || '—'} [${n.config_hash}]`);
            if (n.children) printTree(n.children, indent + 1);
          }
        }
        printTree(tree.roots);
      } else if (getFlag('show')) {
        const entry = archive.get(parseInt(getFlag('show')));
        if (entry) {
          console.log(JSON.stringify(entry, null, 2));
        } else {
          console.error('Archive entry not found.');
        }
      } else if (getFlag('rollback')) {
        const { rollback } = require('./merger');
        rollback(parseInt(getFlag('rollback')));
      } else if (getFlag('compare')) {
        const id1 = parseInt(getFlag('compare'));
        const id2 = parseInt(args[args.indexOf('--compare') + 2]);
        const diff = archive.compare(id1, id2);
        console.log(JSON.stringify(diff, null, 2));
      } else {
        // Default: list
        const entries = archive.list();
        if (entries.length === 0) {
          console.log('Archive is empty. Merge a proposal to create the first entry.');
        }
        for (const e of entries) {
          console.log(`#${e.id} | ${e.timestamp} | ${e.config_hash} | ${e.description?.slice(0, 50) || '—'}`);
        }
      }
      break;
    }

    case 'tasks': {
      const tb = require('./task-bank');

      if (getFlag('seed', false)) {
        tb.seedDefaults();
      } else if (getFlag('add')) {
        const task = tb.addTask({
          name: getFlag('add'),
          description: getFlag('description'),
          category: getFlag('category', 'general'),
          testPrompt: getFlag('prompt', getFlag('add')),
          difficulty: getFlag('difficulty', 'medium')
        });
        console.log(`Added task #${task.id}: ${task.name}`);
      } else {
        const tasks = tb.listTasks(false);
        if (tasks.length === 0) {
          console.log('Task bank is empty. Run: node index.js tasks --seed');
        }
        for (const t of tasks) {
          console.log(`#${t.id} [${t.difficulty}] ${t.name} (${t.category}) ${t.enabled ? '✅' : '❌'}`);
        }
      }
      break;
    }

    case 'history': {
      const { getProposals } = require('./proposer');
      const db = getDb();
      const days = parseInt(getFlag('days', '30'));

      const merged = db.prepare(`
        SELECT p.*, e.improvement_pct, e.baseline_score, e.modified_score
        FROM proposals p
        LEFT JOIN evaluations e ON e.proposal_id = p.id
        WHERE p.status = 'merged' AND p.timestamp >= datetime('now', ?)
        ORDER BY p.timestamp DESC
      `).all(`-${days} days`);

      if (merged.length === 0) {
        console.log(`No improvements merged in the last ${days} days.`);
      } else {
        console.log(`\n📈 Improvements merged (last ${days} days):`);
        for (const m of merged) {
          const imp = m.improvement_pct ? ` (+${m.improvement_pct.toFixed(1)}%)` : '';
          console.log(`  ${m.timestamp} | #${m.id}: ${m.description.slice(0, 60)}${imp}`);
        }
      }
      break;
    }

    default:
      console.log(`Kira Self-Improvement Loop (DGM-lite)

Usage: node index.js <command> [options]

Commands:
  status                          System overview
  log --task "..." --outcome ...  Log a task outcome
  analyze [--days 7]              Analyze failure patterns
  propose [--model qwen3:14b]     Generate improvement proposals
  evaluate --proposal-id <id>     Test a proposal in sandbox
  merge --proposal-id <id>        Apply validated proposal
  run                             Full cycle (analyze→propose→evaluate→merge)
  archive [--list|--tree|--show]  Manage config archive
  tasks [--seed|--list|--add]     Manage evaluation task bank
  history [--days 30]             Show improvement history
`);
  }

  close();
}

main().catch(err => {
  console.error(`[self-improve] Fatal: ${err.message}`);
  close();
  process.exit(1);
});
