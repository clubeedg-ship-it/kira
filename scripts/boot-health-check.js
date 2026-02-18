#!/usr/bin/env node
/**
 * Boot Health Check Script
 * Runs on system startup to verify all systems and restore background processes
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(process.env.HOME, '.clawdbot/background-processes.json');
const LOG_FILE = path.join(process.env.HOME, '.clawdbot/boot-health.log');

function log(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

function exec(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: 30000 }).trim();
  } catch (e) {
    return null;
  }
}

async function checkGateway() {
  const status = exec('systemctl --user is-active clawdbot-gateway');
  return status === 'active';
}

async function getGatewayHealth() {
  const output = exec('clawdbot gateway status 2>&1');
  if (!output) return { running: false };
  
  const running = output.includes('Runtime: running');
  const rpcOk = output.includes('RPC probe: ok');
  return { running, rpcOk, output };
}

function loadSavedProcesses() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) {
    log(`Error loading saved processes: ${e.message}`);
  }
  return { processes: [], savedAt: null };
}

function saveProcesses(processes) {
  const data = {
    processes,
    savedAt: new Date().toISOString()
  };
  fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2));
  log(`Saved ${processes.length} background processes to state file`);
}

function getCurrentBackgroundProcesses() {
  // Get clawdbot exec sessions
  const output = exec('clawdbot process list 2>&1') || '';
  const processes = [];
  
  // Parse process list (format varies, extract key info)
  const lines = output.split('\n').filter(l => l.includes('session'));
  for (const line of lines) {
    const match = line.match(/session[:\s]+(\S+)/);
    if (match) {
      processes.push({
        sessionId: match[1],
        line: line.trim()
      });
    }
  }
  
  return processes;
}

async function sendTelegramNotification(message) {
  // Use clawdbot message tool to notify Otto
  try {
    exec(`clawdbot message send --channel telegram --to "telegram:7985502241" --message "${message.replace(/"/g, '\\"')}"`);
    log('Sent Telegram notification');
  } catch (e) {
    log(`Failed to send notification: ${e.message}`);
  }
}

async function main() {
  log('=== Boot Health Check Starting ===');
  
  const report = {
    timestamp: new Date().toISOString(),
    gateway: { status: 'unknown' },
    processes: { saved: 0, restored: 0 },
    issues: []
  };

  // 1. Check Gateway
  log('Checking gateway status...');
  const gatewayActive = await checkGateway();
  const gatewayHealth = await getGatewayHealth();
  
  if (!gatewayActive) {
    report.gateway.status = 'DOWN';
    report.issues.push('Gateway service not active');
    log('❌ Gateway not active, attempting restart...');
    exec('systemctl --user restart clawdbot-gateway');
    await new Promise(r => setTimeout(r, 5000));
    const retryHealth = await getGatewayHealth();
    if (retryHealth.running) {
      log('✅ Gateway restarted successfully');
      report.gateway.status = 'RESTARTED';
    } else {
      log('❌ Gateway failed to restart');
      report.gateway.status = 'FAILED';
    }
  } else if (!gatewayHealth.running || !gatewayHealth.rpcOk) {
    report.gateway.status = 'DEGRADED';
    report.issues.push('Gateway running but RPC not healthy');
    log('⚠️ Gateway degraded');
  } else {
    report.gateway.status = 'HEALTHY';
    log('✅ Gateway healthy');
  }

  // 2. Check saved background processes
  log('Checking saved background processes...');
  const saved = loadSavedProcesses();
  report.processes.saved = saved.processes.length;
  
  if (saved.processes.length > 0) {
    log(`Found ${saved.processes.length} saved processes from ${saved.savedAt}`);
    for (const proc of saved.processes) {
      log(`  - ${proc.description || proc.command || proc.sessionId}`);
    }
    report.issues.push(`${saved.processes.length} background processes were running before shutdown`);
  }

  // 3. Check critical services
  log('Checking critical paths...');
  const checks = [
    { name: 'Notion API key', cmd: 'test -f ~/.config/notion/api_key && echo ok' },
    { name: 'Clawd workspace', cmd: 'test -d ~/clawd && echo ok' },
    { name: 'Memory system', cmd: 'test -d ~/chimera/memory && echo ok' },
    { name: 'Node.js', cmd: 'node --version' },
  ];

  for (const check of checks) {
    const result = exec(check.cmd);
    if (!result) {
      report.issues.push(`${check.name} check failed`);
      log(`❌ ${check.name}: FAILED`);
    } else {
      log(`✅ ${check.name}: OK`);
    }
  }

  // 4. Build notification message
  let msg = `🔄 **Boot Health Check Complete**\n\n`;
  msg += `**Gateway:** ${report.gateway.status}\n`;
  msg += `**Saved processes:** ${report.processes.saved}\n`;
  
  if (report.issues.length > 0) {
    msg += `\n**Issues (${report.issues.length}):**\n`;
    for (const issue of report.issues) {
      msg += `• ${issue}\n`;
    }
  } else {
    msg += `\n✅ All systems nominal`;
  }

  // 5. Send notification
  log('Sending notification to Otto...');
  console.log('\n' + msg);
  
  // Write report
  const reportFile = path.join(process.env.HOME, '.clawdbot/last-boot-report.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  
  log('=== Boot Health Check Complete ===');
  
  // Return exit code based on issues
  process.exit(report.issues.length > 0 ? 1 : 0);
}

// Command line handling
const args = process.argv.slice(2);

if (args[0] === 'save') {
  // Save current background processes before shutdown
  log('Saving current background processes...');
  const current = getCurrentBackgroundProcesses();
  
  // Also save any important context
  const toSave = {
    processes: current,
    activeAgents: exec('node ~/kira/scripts/subagent-manager.js list 2>&1') || '',
    timestamp: new Date().toISOString()
  };
  
  saveProcesses(current);
  console.log(`Saved ${current.length} processes`);
  process.exit(0);
} else if (args[0] === 'status') {
  // Just show current status
  const saved = loadSavedProcesses();
  console.log('Saved processes:', saved);
  process.exit(0);
} else {
  // Default: run health check
  main().catch(e => {
    log(`Fatal error: ${e.message}`);
    process.exit(1);
  });
}
