#!/usr/bin/env node
/**
 * Agent Orchestrator
 * 
 * Kira runs this to:
 * 1. Check agent schedules
 * 2. Dispatch work to agents (via sessions_spawn)
 * 3. Collect outputs from ~/kira/agents/outputs/
 * 4. Route outputs to the right destination
 * 
 * Usage:
 *   node orchestrator.js status     — show all agents and their state
 *   node orchestrator.js dispatch   — run scheduled agents
 *   node orchestrator.js collect    — process pending outputs
 *   node orchestrator.js run <agent> — manually trigger an agent
 */

import fs from 'fs/promises';
import path from 'path';

const AGENTS_DIR = '/home/adminuser/kira/agents';
const OUTPUTS_DIR = path.join(AGENTS_DIR, 'outputs');
const STATE_FILE = path.join(AGENTS_DIR, 'state.json');

const AGENTS = {
  strategist: {
    name: 'Strategist',
    emoji: '🧠',
    schedule: 'weekly',  // Weekly portfolio review
    lastRun: null,
    soul: path.join(AGENTS_DIR, 'strategist/SOUL.md'),
  },
  content: {
    name: 'Content',
    emoji: '📢',
    schedule: 'daily',   // Daily content draft
    lastRun: null,
    soul: path.join(AGENTS_DIR, 'content/SOUL.md'),
  },
  researcher: {
    name: 'Researcher',
    emoji: '🔍',
    schedule: 'on-demand',
    lastRun: null,
    soul: path.join(AGENTS_DIR, 'researcher/SOUL.md'),
  },
  operator: {
    name: 'Operator',
    emoji: '⚙️',
    schedule: '2h',      // Health checks every 2h
    lastRun: null,
    soul: path.join(AGENTS_DIR, 'operator/SOUL.md'),
  },
  dealmaker: {
    name: 'Dealmaker',
    emoji: '💰',
    schedule: 'weekly',  // Weekly revenue report
    lastRun: null,
    soul: path.join(AGENTS_DIR, 'dealmaker/SOUL.md'),
  },
};

async function loadState() {
  try {
    const data = await fs.readFile(STATE_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return { agents: {}, lastCollect: null };
  }
}

async function saveState(state) {
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
}

async function status() {
  const state = await loadState();
  console.log('\n🤖 Agent Team Status\n');
  
  for (const [id, agent] of Object.entries(AGENTS)) {
    const agentState = state.agents[id] || {};
    const lastRun = agentState.lastRun ? new Date(agentState.lastRun).toLocaleString() : 'never';
    const status = agentState.running ? '🟢 running' : '⚪ idle';
    console.log(`${agent.emoji} ${agent.name.padEnd(12)} | ${status} | schedule: ${agent.schedule} | last: ${lastRun}`);
  }
  
  // Count pending outputs
  try {
    const files = await fs.readdir(OUTPUTS_DIR);
    const pending = files.filter(f => f.endsWith('.json') && !f.startsWith('.'));
    console.log(`\n📬 Pending outputs: ${pending.length}`);
  } catch {
    console.log('\n📬 No outputs directory yet');
  }
}

async function collect() {
  await fs.mkdir(OUTPUTS_DIR, { recursive: true });
  
  const files = await fs.readdir(OUTPUTS_DIR);
  const pending = files.filter(f => f.endsWith('.json') && !f.startsWith('.'));
  
  if (pending.length === 0) {
    console.log('No pending outputs.');
    return [];
  }
  
  const outputs = [];
  for (const file of pending) {
    try {
      const data = await fs.readFile(path.join(OUTPUTS_DIR, file), 'utf8');
      const output = JSON.parse(data);
      outputs.push({ file, ...output });
      
      // Archive processed output
      const archiveDir = path.join(OUTPUTS_DIR, 'processed');
      await fs.mkdir(archiveDir, { recursive: true });
      await fs.rename(
        path.join(OUTPUTS_DIR, file),
        path.join(archiveDir, file)
      );
      
      console.log(`✅ Processed: ${file} (${output.type} from ${output.agent})`);
    } catch (e) {
      console.error(`❌ Error processing ${file}: ${e.message}`);
    }
  }
  
  return outputs;
}

async function getAgentTask(agentId) {
  const agent = AGENTS[agentId];
  if (!agent) throw new Error(`Unknown agent: ${agentId}`);
  
  const soul = await fs.readFile(agent.soul, 'utf8');
  const outputSpec = await fs.readFile(path.join(AGENTS_DIR, 'shared/OUTPUT-SPEC.md'), 'utf8');
  
  // Build task based on agent type
  const tasks = {
    strategist: `You are the Strategist agent. Read your SOUL.md below, then:

1. Read all files in ~/kira/vdr/ to understand current state of each company
2. Read ~/kira/deliverables/ for recent work products  
3. Read ~/kira/memory/ for recent decisions (last 3 days)
4. Produce a WEEKLY PORTFOLIO REVIEW as a document output
5. Identify 1-3 DECISIONS that need Otto's input
6. Create any TASKS that should be done this week

Write all outputs as JSON files to ~/kira/agents/outputs/ following the OUTPUT-SPEC.

SOUL.md:
${soul}

OUTPUT-SPEC.md:
${outputSpec}`,

    content: `You are the Content agent. Read your SOUL.md below, then:

1. Read ~/kira/vdr/ and ~/kira/deliverables/ for recent work
2. Read ~/kira/memory/ for what happened recently
3. Identify 2-3 content-worthy moments from the last week
4. For each, produce a DECISION output asking Otto to approve/rephrase
5. Include both text draft AND video script options where appropriate

Write all outputs as JSON files to ~/kira/agents/outputs/ following the OUTPUT-SPEC.

SOUL.md:
${soul}

OUTPUT-SPEC.md:
${outputSpec}`,

    researcher: `You are the Researcher agent. Your task will be provided separately.`,
    
    operator: `You are the Operator agent. Check system health:
1. Run: pm2 list, docker ps, df -h, free -m
2. Check for any service issues
3. Produce ALERT outputs for anything concerning
4. Produce a brief STATUS document

Write outputs to ~/kira/agents/outputs/`,

    dealmaker: `You are the Dealmaker agent. Read your SOUL.md below, then:
1. Read ~/kira/vdr/zenithcred/ for investor pipeline status
2. Read ~/kira/vdr/ottogen/ for revenue-related deliverables
3. Produce a WEEKLY REVENUE SNAPSHOT document
4. Identify nearest-to-money opportunities as TASKS

Write outputs to ~/kira/agents/outputs/ following OUTPUT-SPEC.`,
  };
  
  return tasks[agentId] || `Run as ${agentId} agent.`;
}

// CLI
const cmd = process.argv[2];
switch (cmd) {
  case 'status':
    await status();
    break;
  case 'collect':
    const outputs = await collect();
    if (outputs.length > 0) {
      console.log(`\nCollected ${outputs.length} outputs. Route them via Kira.`);
    }
    break;
  case 'run': {
    const agentId = process.argv[3];
    if (!agentId || !AGENTS[agentId]) {
      console.error('Usage: orchestrator.js run <agent>');
      console.error('Agents:', Object.keys(AGENTS).join(', '));
      process.exit(1);
    }
    const task = await getAgentTask(agentId);
    console.log(`\n${AGENTS[agentId].emoji} Dispatching ${AGENTS[agentId].name}...`);
    console.log(`Task length: ${task.length} chars`);
    console.log('\nUse sessions_spawn with this task to run the agent.');
    // Output the task for Kira to use with sessions_spawn
    console.log('\n--- TASK START ---');
    console.log(task);
    console.log('--- TASK END ---');
    break;
  }
  default:
    console.log('Usage: orchestrator.js <status|collect|run <agent>>');
}
