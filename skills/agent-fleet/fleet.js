#!/usr/bin/env node
/**
 * Agent Fleet — Parallel coding agent orchestration
 * 
 * Commands:
 *   init <repo>         Initialize fleet for a repo
 *   add --name --branch --prompt --workdir   Add agent to fleet
 *   launch [--name]     Launch all or specific agent
 *   status              Show fleet dashboard
 *   tail --name         Tail agent's PTY output
 *   watch               Live dashboard (refreshes every 10s)
 *   push                Push all branches to origin
 *   cleanup             Remove worktrees
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const FLEET_FILE = '.fleet.json';

function loadFleet() {
  if (!fs.existsSync(FLEET_FILE)) {
    console.error('No fleet initialized. Run: fleet.js init <repo-path>');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(FLEET_FILE, 'utf8'));
}

function saveFleet(fleet) {
  fs.writeFileSync(FLEET_FILE, JSON.stringify(fleet, null, 2));
}

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: 30000, ...opts }).trim();
  } catch (e) {
    return e.stdout?.trim() || '';
  }
}

function getCommits(workdir, base = 'main') {
  return run(`cd ${workdir} && git log --oneline ${base}..HEAD 2>/dev/null`);
}

function getStatus(workdir) {
  return run(`cd ${workdir} && git status --short 2>/dev/null`);
}

function isAlive(pid) {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function getProcessState(pid) {
  const stat = run(`ps -p ${pid} -o stat= 2>/dev/null`);
  if (!stat) return 'dead';
  if (stat.includes('R')) return 'running';
  if (stat.includes('S')) return 'sleeping';
  if (stat.includes('Z')) return 'zombie';
  return stat;
}

// ─── COMMANDS ─────────────────────────────────────────

function init(repoPath) {
  const absPath = path.resolve(repoPath);
  if (!fs.existsSync(path.join(absPath, '.git'))) {
    console.error(`${absPath} is not a git repo`);
    process.exit(1);
  }
  const fleet = { repo: absPath, agents: [], created: new Date().toISOString() };
  saveFleet(fleet);
  console.log(`Fleet initialized for ${absPath}`);
}

function add(args) {
  const fleet = loadFleet();
  const agent = {
    name: args.name,
    branch: args.branch || `agent/${args.name}`,
    prompt: args.prompt,
    workdir: args.workdir || `/tmp/fleet-${args.name}`,
    pid: null,
    logFile: null,
    status: 'pending',
    launchedAt: null,
  };
  fleet.agents.push(agent);
  saveFleet(fleet);
  console.log(`Added agent "${agent.name}" → ${agent.branch}`);
}

function launch(targetName) {
  const fleet = loadFleet();
  const agents = targetName 
    ? fleet.agents.filter(a => a.name === targetName)
    : fleet.agents;

  for (const agent of agents) {
    // Create worktree
    if (!fs.existsSync(agent.workdir)) {
      console.log(`Creating worktree: ${agent.workdir} (${agent.branch})`);
      run(`cd ${fleet.repo} && git worktree add -b ${agent.branch} ${agent.workdir} main 2>/dev/null || git worktree add ${agent.workdir} ${agent.branch}`);
    }

    // Read prompt file
    const promptPath = path.join(agent.workdir, agent.prompt);
    let promptText = '';
    if (fs.existsSync(promptPath)) {
      promptText = fs.readFileSync(promptPath, 'utf8');
    } else {
      promptText = agent.prompt; // Direct prompt string
    }

    // Launch with script for PTY capture
    agent.logFile = path.join(agent.workdir, 'agent.log');
    
    const wakeCmd = `openclaw gateway wake --text "Fleet agent ${agent.name} finished" --mode now`;
    const fullPrompt = `${promptText}\n\nWhen completely finished, run: ${wakeCmd}`;
    
    // Write prompt to temp file to avoid shell escaping issues
    const promptFile = path.join(agent.workdir, '.agent-prompt.txt');
    fs.writeFileSync(promptFile, fullPrompt);

    const child = spawn('script', [
      '-q', '-c',
      `cd ${agent.workdir} && claude --dangerously-skip-permissions -p "$(cat ${promptFile})"`,
      agent.logFile
    ], {
      detached: true,
      stdio: 'ignore',
      env: { ...process.env, TERM: 'xterm-256color' },
    });

    child.unref();
    agent.pid = child.pid;
    agent.status = 'running';
    agent.launchedAt = new Date().toISOString();
    
    console.log(`Launched "${agent.name}" (PID ${agent.pid}) → ${agent.logFile}`);
  }

  saveFleet(fleet);
}

function status() {
  const fleet = loadFleet();
  const now = Date.now();

  console.log(`\n🚢 FLEET STATUS — ${fleet.repo}\n`);
  console.log('─'.repeat(80));
  console.log(
    'Agent'.padEnd(16) +
    'Branch'.padEnd(24) +
    'State'.padEnd(12) +
    'Commits'.padEnd(10) +
    'Uncommitted'.padEnd(14) +
    'Time'
  );
  console.log('─'.repeat(80));

  for (const agent of fleet.agents) {
    // Process state
    let state = '⚪ pending';
    if (agent.pid) {
      if (isAlive(agent.pid)) {
        const ps = getProcessState(agent.pid);
        state = ps === 'running' ? '🟢 active' : '🟡 thinking';
      } else {
        state = '✅ done';
        agent.status = 'done';
      }
    }

    // Commits
    const commits = agent.workdir && fs.existsSync(agent.workdir)
      ? getCommits(agent.workdir).split('\n').filter(Boolean).length
      : 0;

    // Uncommitted files
    const uncommitted = agent.workdir && fs.existsSync(agent.workdir)
      ? getStatus(agent.workdir).split('\n').filter(Boolean).length
      : 0;

    // Elapsed time
    const elapsed = agent.launchedAt
      ? `${Math.round((now - new Date(agent.launchedAt).getTime()) / 60000)}min`
      : '-';

    console.log(
      agent.name.padEnd(16) +
      agent.branch.padEnd(24) +
      state.padEnd(12) +
      String(commits).padEnd(10) +
      String(uncommitted).padEnd(14) +
      elapsed
    );
  }

  console.log('─'.repeat(80));

  // Show commits per agent
  console.log('\n📝 COMMITS:\n');
  for (const agent of fleet.agents) {
    if (!agent.workdir || !fs.existsSync(agent.workdir)) continue;
    const commits = getCommits(agent.workdir);
    if (commits) {
      console.log(`  ${agent.name}:`);
      commits.split('\n').forEach(c => console.log(`    ${c}`));
      console.log('');
    }
  }

  saveFleet(fleet);
}

function tail(name) {
  const fleet = loadFleet();
  const agent = fleet.agents.find(a => a.name === name);
  if (!agent) { console.error(`Agent "${name}" not found`); process.exit(1); }
  if (!agent.logFile || !fs.existsSync(agent.logFile)) {
    console.error(`No log file for "${name}". Was it launched?`);
    process.exit(1);
  }

  console.log(`Tailing ${agent.logFile} (Ctrl+C to stop):\n`);
  const child = spawn('tail', ['-f', agent.logFile], { stdio: 'inherit' });
  process.on('SIGINT', () => { child.kill(); process.exit(0); });
}

function watch() {
  const refresh = () => {
    console.clear();
    status();
    
    const fleet = loadFleet();
    const allDone = fleet.agents.every(a => !a.pid || !isAlive(a.pid));
    if (allDone) {
      console.log('\n🎉 All agents finished!\n');
      process.exit(0);
    }
  };

  refresh();
  setInterval(refresh, 10000);
}

function push() {
  const fleet = loadFleet();
  const branches = fleet.agents.map(a => a.branch).join(' ');
  console.log(`Pushing: ${branches}`);
  const result = run(`cd ${fleet.repo} && git push origin ${branches} 2>&1`);
  console.log(result);
}

function cleanup() {
  const fleet = loadFleet();
  for (const agent of fleet.agents) {
    if (agent.pid && isAlive(agent.pid)) {
      console.log(`Killing agent "${agent.name}" (PID ${agent.pid})`);
      try { process.kill(agent.pid, 'SIGTERM'); } catch {}
    }
    if (agent.workdir && fs.existsSync(agent.workdir)) {
      console.log(`Removing worktree: ${agent.workdir}`);
      run(`cd ${fleet.repo} && git worktree remove ${agent.workdir} --force 2>/dev/null`);
    }
  }
  if (fs.existsSync(FLEET_FILE)) fs.unlinkSync(FLEET_FILE);
  console.log('Fleet cleaned up.');
}

// ─── CLI ─────────────────────────────────────────

const args = process.argv.slice(2);
const cmd = args[0];

function parseArgs(args) {
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      result[key] = args[i + 1] || true;
      i++;
    }
  }
  return result;
}

switch (cmd) {
  case 'init':
    init(args[1] || '.');
    break;
  case 'add':
    add(parseArgs(args.slice(1)));
    break;
  case 'launch':
    launch(parseArgs(args.slice(1)).name);
    break;
  case 'status':
    status();
    break;
  case 'tail':
    tail(parseArgs(args.slice(1)).name);
    break;
  case 'watch':
    watch();
    break;
  case 'push':
    push();
    break;
  case 'cleanup':
    cleanup();
    break;
  default:
    console.log(`Usage: fleet.js <init|add|launch|status|tail|watch|push|cleanup>`);
}
