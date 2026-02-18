/**
 * Auth module for Kira Command Center
 * JWT + bcrypt + SQLite
 */
const crypto = require('crypto');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Persist JWT secret so restarts don't invalidate all sessions
const JWT_SECRET_FILE = path.join(__dirname, 'data', '.jwt-secret');
function getJWTSecret() {
  if (process.env.KIRA_JWT_SECRET) return process.env.KIRA_JWT_SECRET;
  try { return fs.readFileSync(JWT_SECRET_FILE, 'utf8').trim(); } catch {}
  const secret = crypto.randomBytes(32).toString('hex');
  fs.mkdirSync(path.dirname(JWT_SECRET_FILE), { recursive: true });
  fs.writeFileSync(JWT_SECRET_FILE, secret, { mode: 0o600 });
  return secret;
}
const JWT_SECRET = getJWTSecret();
const DATA_DIR = process.env.KIRA_DATA_DIR || path.join(__dirname, 'data');

// Ensure data dir exists
fs.mkdirSync(DATA_DIR, { recursive: true });

// System DB for users + sessions
const db = new Database(path.join(DATA_DIR, 'system.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    tier TEXT DEFAULT 'free',
    email_verified INTEGER DEFAULT 0,
    verification_code TEXT,
    verification_expires TEXT,
    stripe_customer_id TEXT,
    subscription_status TEXT DEFAULT 'none',
    created_at TEXT DEFAULT (datetime('now')),
    last_login_at TEXT,
    disabled INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    token_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    revoked INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER DEFAULT 1,
    window_start INTEGER NOT NULL
  );
`);

// Simple password hashing (scrypt — no bcrypt dependency needed)
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const attempt = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(attempt, 'hex'));
}

// Simple JWT (no library needed)
function createJWT(payload, expiresInSec = 86400) { // 24h (was 15min)
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(JSON.stringify({ ...payload, iat: now, exp: now + expiresInSec })).toString('base64url');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function verifyJWT(token) {
  try {
    const [header, body, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

// Generate ULID-like ID
function genId() {
  const t = Date.now().toString(36).padStart(10, '0');
  const r = crypto.randomBytes(8).toString('hex');
  return `${t}${r}`;
}

// Rate limiting
function checkRate(key, maxPerWindow, windowSec) {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - (now % windowSec);
  const rateKey = `${key}:${windowStart}`;
  
  const row = db.prepare('SELECT count FROM rate_limits WHERE key = ?').get(rateKey);
  if (row && row.count >= maxPerWindow) return false;
  
  db.prepare(`INSERT INTO rate_limits (key, count, window_start) VALUES (?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET count = count + 1`).run(rateKey, windowStart);
  
  // Cleanup old entries
  db.prepare('DELETE FROM rate_limits WHERE window_start < ?').run(windowStart - windowSec * 2);
  return true;
}

// Register
function register(email, password, displayName) {
  if (!email || !password || !displayName) throw new Error('Email, password, and display name required');
  if (password.length < 8) throw new Error('Password must be at least 8 characters');
  
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) throw new Error('Account already exists');
  
  const id = genId();
  const hash = hashPassword(password);
  const code = String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
  const expires = new Date(Date.now() + 15 * 60000).toISOString();
  
  db.prepare(`INSERT INTO users (id, email, display_name, password_hash, verification_code, verification_expires)
    VALUES (?, ?, ?, ?, ?, ?)`).run(id, email.toLowerCase(), displayName, hash, code, expires);
  
  return { userId: id, code, email: email.toLowerCase() };
}

// Verify email
function verifyEmail(email, code) {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) throw new Error('Invalid credentials');
  if (user.email_verified) throw new Error('Already verified');
  if (user.verification_code !== code) throw new Error('Invalid code');
  if (new Date(user.verification_expires) < new Date()) throw new Error('Code expired');
  
  db.prepare('UPDATE users SET email_verified = 1, verification_code = NULL WHERE id = ?').run(user.id);
  return issueTokens(user);
}

// Login
function login(email, password) {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user || !verifyPassword(password, user.password_hash)) throw new Error('Invalid credentials');
  if (user.disabled) throw new Error('Account disabled');
  // For now, skip email verification requirement (v1)
  
  db.prepare('UPDATE users SET last_login_at = datetime(\'now\') WHERE id = ?').run(user.id);
  return issueTokens(user);
}

function issueTokens(user) {
  const token = createJWT({ sub: user.id, role: user.role, tier: user.tier }, 900); // 15 min
  const refreshToken = crypto.randomBytes(32).toString('hex');
  const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expires = new Date(Date.now() + 30 * 86400000).toISOString();
  
  db.prepare('INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)')
    .run(genId(), user.id, refreshHash, expires);
  
  return {
    token,
    refreshToken,
    user: { id: user.id, email: user.email, displayName: user.display_name, role: user.role, tier: user.tier }
  };
}

// Refresh
function refresh(refreshToken) {
  const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const session = db.prepare('SELECT * FROM sessions WHERE token_hash = ? AND revoked = 0').get(hash);
  if (!session || new Date(session.expires_at) < new Date()) throw new Error('Invalid session');
  
  // Revoke old session (rotation)
  db.prepare('UPDATE sessions SET revoked = 1 WHERE id = ?').run(session.id);
  
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id);
  if (!user || user.disabled) throw new Error('Account disabled');
  
  return issueTokens(user);
}

// Logout
function logout(refreshToken) {
  const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  db.prepare('UPDATE sessions SET revoked = 1 WHERE token_hash = ?').run(hash);
}

// Get user from JWT
function getUser(token) {
  const payload = verifyJWT(token);
  if (!payload) return null;
  return db.prepare('SELECT id, email, display_name, role, tier, created_at, last_login_at FROM users WHERE id = ?').get(payload.sub);
}

// Auth middleware helper — extracts user from Authorization header
function extractUser(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return getUser(auth.slice(7));
}

// Admin: list users
function listUsers() {
  return db.prepare('SELECT id, email, display_name, role, tier, email_verified, created_at, last_login_at, disabled FROM users ORDER BY created_at DESC').all();
}

// Admin: update user
function updateUser(userId, updates) {
  const allowed = ['role', 'tier', 'disabled'];
  const sets = [];
  const vals = [];
  for (const [k, v] of Object.entries(updates)) {
    if (allowed.includes(k)) { sets.push(`${k} = ?`); vals.push(v); }
  }
  if (sets.length === 0) throw new Error('No valid fields to update');
  vals.push(userId);
  db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
}

module.exports = {
  register, verifyEmail, login, refresh, logout,
  getUser, extractUser, listUsers, updateUser,
  checkRate, db,
};
