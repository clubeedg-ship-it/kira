/**
 * Security: Rate limiting, brute force detection, logging, input sanitization, CSP
 */
const fs = require('fs');
const path = require('path');

// --- Rate Limiting & Brute Force Detection ---
const rateLimitMap = new Map();
const bruteForceMap = new Map();
const RATE_AUTH_MAX = 5, RATE_AUTH_WINDOW = 60000;
const RATE_API_MAX = 30, RATE_API_WINDOW = 60000;
const BRUTE_MAX_FAILURES = 10, BRUTE_WINDOW = 300000, BRUTE_BLOCK_DURATION = 900000;

function checkRateLimit(ip, type) {
  const now = Date.now();
  if (!rateLimitMap.has(ip)) rateLimitMap.set(ip, { auth: [], api: [] });
  const bucket = rateLimitMap.get(ip);
  const max = type === 'auth' ? RATE_AUTH_MAX : RATE_API_MAX;
  const window = type === 'auth' ? RATE_AUTH_WINDOW : RATE_API_WINDOW;
  bucket[type] = bucket[type].filter(ts => now - ts < window);
  if (bucket[type].length >= max) return false;
  bucket[type].push(now);
  return true;
}

function isBruteForceBlocked(ip) {
  const entry = bruteForceMap.get(ip);
  if (!entry) return false;
  if (entry.blockedUntil && Date.now() < entry.blockedUntil) return true;
  if (entry.blockedUntil && Date.now() >= entry.blockedUntil) {
    bruteForceMap.delete(ip);
    return false;
  }
  return false;
}

function recordLoginFailure(ip) {
  const now = Date.now();
  if (!bruteForceMap.has(ip)) bruteForceMap.set(ip, { failures: [], blockedUntil: null });
  const entry = bruteForceMap.get(ip);
  entry.failures = entry.failures.filter(ts => now - ts < BRUTE_WINDOW);
  entry.failures.push(now);
  if (entry.failures.length >= BRUTE_MAX_FAILURES) {
    entry.blockedUntil = now + BRUTE_BLOCK_DURATION;
    securityLog(`BLOCKED IP=${ip} reason=brute_force failures=${entry.failures.length} blocked_until=${new Date(entry.blockedUntil).toISOString()}`);
  }
}

function recordLoginSuccess(ip) {
  bruteForceMap.delete(ip);
}

// --- Logging ---
const ACCESS_LOG = path.join(__dirname, '..', 'data', 'access.log');
const SECURITY_LOG = path.join(__dirname, '..', 'data', 'security.log');

function accessLog(ip, method, pathname, status) {
  const line = `[${new Date().toISOString()}] ${ip} ${method} ${pathname} ${status}\n`;
  fs.appendFile(ACCESS_LOG, line, () => {});
  if (Math.random() < 0.01) rotateLog(ACCESS_LOG, 10000);
}

function securityLog(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFile(SECURITY_LOG, line, () => {});
}

function rotateLog(filePath, maxLines) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    if (lines.length > maxLines) {
      fs.writeFileSync(filePath, lines.slice(-maxLines).join('\n'));
    }
  } catch {}
}

// --- Input Sanitization ---
function sanitizeInput(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/<[^>]*>/g, '').trim();
}

// --- CSP Builder ---
function buildContentSecurityPolicy(nonce) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    `script-src-elem 'self' 'nonce-${nonce}'`,
    "script-src-attr 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data:",
    "connect-src 'self' ws: wss:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'"
  ].join('; ');
}

// Cleanup stale rate limit entries every 5 min
setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of rateLimitMap) {
    bucket.auth = bucket.auth.filter(ts => now - ts < RATE_AUTH_WINDOW);
    bucket.api = bucket.api.filter(ts => now - ts < RATE_API_WINDOW);
    if (!bucket.auth.length && !bucket.api.length) rateLimitMap.delete(ip);
  }
  for (const [ip, entry] of bruteForceMap) {
    if (entry.blockedUntil && now >= entry.blockedUntil) bruteForceMap.delete(ip);
    else {
      entry.failures = entry.failures.filter(ts => now - ts < BRUTE_WINDOW);
      if (!entry.failures.length && !entry.blockedUntil) bruteForceMap.delete(ip);
    }
  }
}, 300000);

module.exports = {
  rateLimitMap,
  bruteForceMap,
  checkRateLimit,
  isBruteForceBlocked,
  recordLoginFailure,
  recordLoginSuccess,
  accessLog,
  securityLog,
  sanitizeInput,
  buildContentSecurityPolicy,
  ACCESS_LOG,
  SECURITY_LOG
};
