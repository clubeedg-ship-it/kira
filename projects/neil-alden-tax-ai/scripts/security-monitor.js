#!/usr/bin/env node
/**
 * Security Monitor - MSTA Tax AI
 * Reads access.log and security.log, reports suspicious activity
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ACCESS_LOG = path.join(DATA_DIR, 'access.log');
const SECURITY_LOG = path.join(DATA_DIR, 'security.log');

function readLines(file) {
  try { return fs.readFileSync(file, 'utf-8').split('\n').filter(Boolean); } catch { return []; }
}

console.log('=== MSTA Security Monitor ===\n');

// Access log analysis
const accessLines = readLines(ACCESS_LOG);
console.log(`📊 Access Log: ${accessLines.length} entries`);

const ipRequests = {};
const pathRequests = {};
const statusCounts = {};
for (const line of accessLines) {
  const m = line.match(/\[(.*?)\] (\S+) (\S+) (\S+) (\d+)/);
  if (!m) continue;
  const [, , ip, method, urlPath, status] = m;
  ipRequests[ip] = (ipRequests[ip] || 0) + 1;
  pathRequests[urlPath] = (pathRequests[urlPath] || 0) + 1;
  statusCounts[status] = (statusCounts[status] || 0) + 1;
}

console.log('\n🌐 Top 20 IPs by request count:');
Object.entries(ipRequests).sort((a, b) => b[1] - a[1]).slice(0, 20)
  .forEach(([ip, count]) => console.log(`  ${ip}: ${count} requests`));

console.log('\n📈 Status code distribution:');
Object.entries(statusCounts).sort((a, b) => b[1] - a[1])
  .forEach(([status, count]) => console.log(`  ${status}: ${count}`));

console.log('\n🔥 Top paths:');
Object.entries(pathRequests).sort((a, b) => b[1] - a[1]).slice(0, 10)
  .forEach(([p, count]) => console.log(`  ${p}: ${count}`));

// Security log analysis
const secLines = readLines(SECURITY_LOG);
console.log(`\n🔒 Security Log: ${secLines.length} entries`);

const failedLogins = {};
const blockedIPs = new Set();
for (const line of secLines) {
  if (line.includes('LOGIN_FAIL')) {
    const m = line.match(/IP=(\S+)/);
    if (m) failedLogins[m[1]] = (failedLogins[m[1]] || 0) + 1;
  }
  if (line.includes('BLOCKED')) {
    const m = line.match(/IP=(\S+)/);
    if (m) blockedIPs.add(m[1]);
  }
}

if (Object.keys(failedLogins).length) {
  console.log('\n❌ Failed logins by IP:');
  Object.entries(failedLogins).sort((a, b) => b[1] - a[1])
    .forEach(([ip, count]) => console.log(`  ${ip}: ${count} failures`));
}

if (blockedIPs.size) {
  console.log('\n🚫 IPs that have been blocked:');
  blockedIPs.forEach(ip => console.log(`  ${ip}`));
}

// Suspicious patterns
console.log('\n⚠️  Suspicious patterns:');
const suspicious = accessLines.filter(l => 
  l.includes('/src/') || l.includes('.db') || l.includes('.env') || 
  l.includes('..') || l.includes('/etc/') || l.includes('wp-admin')
);
if (suspicious.length) {
  suspicious.slice(-20).forEach(l => console.log(`  ${l}`));
} else {
  console.log('  None detected');
}

console.log('\n✅ Report complete');
