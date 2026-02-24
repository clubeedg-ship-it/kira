#!/usr/bin/env node
/**
 * Omiximo Email Automation Health Check
 * 
 * Runs daily via cron agent. Checks:
 * 1. Container running & healthy
 * 2. Email inbox vs processed/recorded sales
 * 3. Failed orders analysis
 * 4. Stock anomalies
 * 
 * Outputs a report for the agent to relay to Otto if issues found.
 */

const { execSync } = require('child_process');

function run(cmd, timeout = 30000) {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout }).trim();
  } catch (e) {
    return `ERROR: ${e.message}`;
  }
}

function main() {
  const report = [];
  const issues = [];
  const now = new Date().toISOString().slice(0, 19);
  
  report.push(`# Omiximo Health Check — ${now}`);
  report.push('');

  // 1. Container status
  const ps = run('docker inspect --format="{{.State.Status}} {{.State.Health.Status}}" omiximo-email-automation 2>&1');
  const containerOk = ps.includes('running') && ps.includes('healthy');
  report.push(`## Container: ${containerOk ? '✅ Running & Healthy' : '❌ ' + ps}`);
  if (!containerOk) issues.push('Container not running or unhealthy');

  // 2. Last cron run
  const lastRun = run('docker exec omiximo-email-automation cat /app/data/last_run.txt 2>&1');
  if (lastRun && !lastRun.startsWith('ERROR')) {
    const lastRunTime = new Date(parseInt(lastRun) * 1000);
    const hoursAgo = ((Date.now() - lastRunTime.getTime()) / 3600000).toFixed(1);
    const runOk = parseFloat(hoursAgo) < 2;
    report.push(`## Last Run: ${lastRunTime.toISOString().slice(0, 19)} (${hoursAgo}h ago) ${runOk ? '✅' : '❌ STALE'}`);
    if (!runOk) issues.push(`Last run was ${hoursAgo}h ago (should be <2h)`);
  } else {
    report.push('## Last Run: ❌ No timestamp found');
    issues.push('No last_run.txt — cron may not be executing');
  }

  // 3. Processed emails analysis
  const trackerJson = run('docker exec omiximo-email-automation cat /app/data/processed_emails.json 2>&1');
  let tracker = {};
  try { tracker = JSON.parse(trackerJson); } catch(e) { 
    issues.push('Cannot parse processed_emails.json');
  }
  
  const entries = Object.values(tracker);
  const total = entries.length;
  const successes = entries.filter(e => e.success).length;
  const failures = entries.filter(e => !e.success).length;
  
  report.push('');
  report.push(`## Processed Emails: ${total} total (${successes} success, ${failures} failed)`);
  
  // Recent failures (last 7 days based on processed_at)
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const recentFailures = entries.filter(e => !e.success && (e.processed_at || '') > weekAgo);
  
  if (recentFailures.length > 0) {
    report.push('');
    report.push(`### Recent Failures (last 7 days): ${recentFailures.length}`);
    
    // Group by error type
    const errorGroups = {};
    for (const f of recentFailures) {
      const errType = f.error?.includes('Missing components') ? 'Missing components (parser)' :
                      f.error?.includes('No stock') ? 'No stock available' :
                      f.error?.slice(0, 50) || 'Unknown';
      errorGroups[errType] = (errorGroups[errType] || 0) + 1;
    }
    for (const [err, count] of Object.entries(errorGroups)) {
      report.push(`  • ${count}x ${err}`);
      if (err === 'Missing components (parser)') {
        issues.push(`${count} orders failed due to parser issues in last 7 days`);
      }
    }
    
    // List individual recent failures
    report.push('');
    report.push('### Failed Orders Detail:');
    for (const f of recentFailures.slice(-10)) {
      report.push(`  • ${f.order_number || '?'} | SKU: ${f.sku || '?'} | ${f.error?.slice(0, 100)}`);
    }
  }

  // 4. Check inbox for unprocessed emails (last 48h)
  report.push('');
  const inboxCheck = run(`docker exec omiximo-email-automation python3 -c "
from src.email_client import IMAPClient
from src.config import Config
from src.utils.tracking import ProcessedEmailTracker
t = ProcessedEmailTracker()
c = IMAPClient(); c.connect(); c.select_inbox()
unprocessed = []
for name, sender in Config.MARKETPLACE_SENDERS.items():
    ids = c.search_from_sender(sender, unseen_only=False, since_hours=48)
    for eid in ids:
        data = c.fetch_email(eid)
        if data:
            mid = data.get('message_id','')
            if not t.is_successfully_processed(mid):
                subj = data.get('subject','')[:80]
                unprocessed.append(f'{name}|{subj}')
c.disconnect()
print(len(unprocessed))
for u in unprocessed[:15]:
    print(u)
" 2>&1`);
  
  const inboxLines = inboxCheck.split('\n').filter(l => l.trim());
  const unprocessedCount = parseInt(inboxLines[0]) || 0;
  
  report.push(`## Unprocessed Emails (48h): ${unprocessedCount}`);
  if (unprocessedCount > 0) {
    for (const line of inboxLines.slice(1)) {
      report.push(`  • ${line}`);
    }
    if (unprocessedCount > 3) {
      issues.push(`${unprocessedCount} emails in inbox not successfully processed (48h window)`);
    }
  }

  // 5. Stock warnings
  report.push('');
  const stockCheck = run(`docker exec omiximo-email-automation python3 -c "
from src.inventory import InvenTreeClient
c = InvenTreeClient()
c.authenticate()
# Check key components
skus = ['RYZEN 3-3200', 'RYZEN 5-4500', 'RYZEN 7-5700X', 'RTX3050-6GB', 'RTX-5050', 'RTX-5060', 'RTX-5070', '8GB RAM', '16GB RAM', '256GB SSD', '512GB SSD', '1TB SSD', '2TB SSD']
for sku in skus:
    part = c.get_part_by_sku(sku)
    if part:
        stock = part.get('in_stock', 0)
        flag = 'LOW' if stock <= 5 else ('OUT' if stock <= 0 else 'OK')
        print(f'{flag}|{sku}|{stock}')
    else:
        print(f'MISSING|{sku}|0')
" 2>&1`);

  const stockLines = stockCheck.split('\n').filter(l => l.includes('|'));
  const lowStock = stockLines.filter(l => l.startsWith('LOW') || l.startsWith('OUT') || l.startsWith('MISSING'));
  
  report.push(`## Stock Status: ${lowStock.length > 0 ? '⚠️ Issues' : '✅ OK'}`);
  for (const line of stockLines) {
    const [status, sku, qty] = line.split('|');
    const icon = status === 'OK' ? '✅' : status === 'LOW' ? '⚠️' : '❌';
    report.push(`  ${icon} ${sku}: ${qty}`);
  }
  if (lowStock.length > 0) {
    issues.push(`${lowStock.length} components low/out of stock`);
  }

  // Summary
  report.push('');
  report.push('---');
  if (issues.length === 0) {
    report.push('## ✅ All systems nominal. No issues found.');
  } else {
    report.push(`## ⚠️ ${issues.length} issue(s) found:`);
    for (const issue of issues) {
      report.push(`  • ${issue}`);
    }
  }

  const fullReport = report.join('\n');
  console.log(fullReport);
  
  // Exit with code indicating issues
  process.exit(issues.length > 0 ? 1 : 0);
}

main();
