#!/usr/bin/env node
/**
 * Agent Orchestrator - Stolen patterns from codex-orchestrator
 * 
 * Spawn parallel agents via tmux, monitor progress, send mid-task messages
 * Designed for Clawdbot/Kira orchestration
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const JOBS_DIR = path.join(process.env.HOME, '.kira', 'jobs');
const MAP_FILE = path.join(process.env.HOME, 'clawd', 'docs', 'CODEBASE_MAP.md');

// Ensure jobs directory exists
if (!fs.existsSync(JOBS_DIR)) {
  fs.mkdirSync(JOBS_DIR, { recursive: true });
}

function generateJobId() {
  return Math.random().toString(36).substring(2, 10);
}

function getJobs() {
  if (!fs.existsSync(JOBS_DIR)) return [];
  return fs.readdirSync(JOBS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(JOBS_DIR, f))))
    .sort((a, b) => b.startedAt - a.startedAt);
}

function startAgent(prompt, options = {}) {
  const jobId = generateJobId();
  const sessionName = `kira-agent-${jobId}`;
  const logFile = path.join(JOBS_DIR, `${jobId}.log`);
  
  // Build context
  let fullPrompt = prompt;
  if (options.map && fs.existsSync(MAP_FILE)) {
    const map = fs.readFileSync(MAP_FILE, 'utf-8');
    fullPrompt = `## Codebase Context\n${map}\n\n## Task\n${prompt}`;
  }
  
  // Job metadata
  const job = {
    id: jobId,
    session: sessionName,
    prompt: prompt,
    status: 'running',
    startedAt: Date.now(),
    options,
    logFile
  };
  
  // Save job
  fs.writeFileSync(path.join(JOBS_DIR, `${jobId}.json`), JSON.stringify(job, null, 2));
  
  // Create tmux session with agent
  const agentCmd = options.agent || 'claude'; // claude, codex, pi, etc.
  const cmd = `tmux new-session -d -s ${sessionName} "script -q ${logFile} -c '${agentCmd} \\"${fullPrompt.replace(/"/g, '\\"')}\\"'"`;
  
  try {
    execSync(cmd);
    console.log(JSON.stringify({ success: true, jobId, session: sessionName }));
  } catch (e) {
    job.status = 'failed';
    job.error = e.message;
    fs.writeFileSync(path.join(JOBS_DIR, `${jobId}.json`), JSON.stringify(job, null, 2));
    console.log(JSON.stringify({ success: false, error: e.message }));
  }
  
  return jobId;
}

function sendMessage(jobId, message) {
  const jobFile = path.join(JOBS_DIR, `${jobId}.json`);
  if (!fs.existsSync(jobFile)) {
    console.log(JSON.stringify({ success: false, error: 'Job not found' }));
    return;
  }
  
  const job = JSON.parse(fs.readFileSync(jobFile));
  
  try {
    // Send keys to tmux session
    execSync(`tmux send-keys -t ${job.session} "${message.replace(/"/g, '\\"')}" Enter`);
    console.log(JSON.stringify({ success: true, jobId, message: 'sent' }));
  } catch (e) {
    console.log(JSON.stringify({ success: false, error: e.message }));
  }
}

function captureOutput(jobId, lines = 50) {
  const jobFile = path.join(JOBS_DIR, `${jobId}.json`);
  if (!fs.existsSync(jobFile)) {
    console.log(JSON.stringify({ success: false, error: 'Job not found' }));
    return;
  }
  
  const job = JSON.parse(fs.readFileSync(jobFile));
  
  if (fs.existsSync(job.logFile)) {
    const output = execSync(`tail -${lines} "${job.logFile}"`).toString();
    // Strip ANSI codes
    const clean = output.replace(/\x1b\[[0-9;]*m/g, '');
    console.log(JSON.stringify({ success: true, jobId, output: clean }));
  } else {
    console.log(JSON.stringify({ success: false, error: 'No output yet' }));
  }
}

function listJobs(json = false) {
  const jobs = getJobs();
  
  // Update status for each job
  jobs.forEach(job => {
    try {
      execSync(`tmux has-session -t ${job.session} 2>/dev/null`);
      job.status = 'running';
    } catch {
      if (job.status === 'running') {
        job.status = 'completed';
        fs.writeFileSync(path.join(JOBS_DIR, `${job.id}.json`), JSON.stringify(job, null, 2));
      }
    }
    job.elapsed_ms = Date.now() - job.startedAt;
  });
  
  if (json) {
    console.log(JSON.stringify(jobs, null, 2));
  } else {
    jobs.forEach(j => {
      const elapsed = Math.round(j.elapsed_ms / 1000);
      console.log(`${j.id}\t${j.status}\t${elapsed}s\t${j.prompt.substring(0, 50)}...`);
    });
  }
}

function killJob(jobId) {
  const jobFile = path.join(JOBS_DIR, `${jobId}.json`);
  if (!fs.existsSync(jobFile)) {
    console.log(JSON.stringify({ success: false, error: 'Job not found' }));
    return;
  }
  
  const job = JSON.parse(fs.readFileSync(jobFile));
  
  try {
    execSync(`tmux kill-session -t ${job.session} 2>/dev/null`);
    job.status = 'killed';
    fs.writeFileSync(jobFile, JSON.stringify(job, null, 2));
    console.log(JSON.stringify({ success: true, jobId, status: 'killed' }));
  } catch (e) {
    console.log(JSON.stringify({ success: false, error: e.message }));
  }
}

// CLI
const [,, cmd, ...args] = process.argv;

switch (cmd) {
  case 'start':
    const prompt = args.join(' ');
    const map = args.includes('--map');
    startAgent(prompt.replace('--map', '').trim(), { map });
    break;
  case 'send':
    sendMessage(args[0], args.slice(1).join(' '));
    break;
  case 'capture':
    captureOutput(args[0], parseInt(args[1]) || 50);
    break;
  case 'jobs':
    listJobs(args.includes('--json'));
    break;
  case 'kill':
    killJob(args[0]);
    break;
  case 'health':
    try {
      execSync('which tmux');
      console.log('tmux: OK');
    } catch {
      console.log('tmux: NOT FOUND');
    }
    break;
  default:
    console.log(`
Agent Orchestrator - Spawn and manage parallel agents

Commands:
  start <prompt> [--map]  Start agent with prompt
  send <id> <message>     Send message to running agent
  capture <id> [lines]    Capture output (default 50 lines)
  jobs [--json]           List all jobs
  kill <id>               Kill a running job
  health                  Check dependencies
`);
}
