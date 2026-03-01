/**
 * Auth: SQLite DB setup, users, sessions, login/register, cookie helpers
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const authDb = new Database(path.join(DATA_DIR, 'auth.db'));
authDb.pragma('journal_mode = WAL');
authDb.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS support_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT,
    image TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS support_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    summary TEXT,
    steps TEXT,
    expected TEXT,
    actual TEXT,
    screenshot TEXT,
    severity TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'open',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS usage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    model TEXT,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cost_usd REAL DEFAULT 0,
    metadata TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS opinions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT,
    client_name TEXT,
    country TEXT,
    form_data TEXT,
    opinion_text TEXT,
    sources TEXT,
    treaty_analysis TEXT,
    status TEXT DEFAULT 'complete',
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// One-time migrations
try { authDb.exec('ALTER TABLE opinions ADD COLUMN audit_result TEXT'); } catch {}
try { authDb.exec('ALTER TABLE opinions ADD COLUMN audit_approved INTEGER DEFAULT 0'); } catch {}

// One-time migration: promote otto to admin
authDb.prepare("UPDATE users SET role = 'admin' WHERE email = 'otto@oopuo.com'").run();

// IP Geolocation (free, no API key)
const geoCache = new Map();
async function geolocateIP(ip, userId) {
  if (geoCache.has(ip)) {
    const loc = geoCache.get(ip);
    authDb.prepare('UPDATE users SET last_location = ? WHERE id = ?').run(loc, userId);
    return;
  }
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city`);
    const d = await res.json();
    if (d.status === 'success') {
      const loc = `${d.city}, ${d.regionName}, ${d.country}`;
      geoCache.set(ip, loc);
      authDb.prepare('UPDATE users SET last_location = ? WHERE id = ?').run(loc, userId);
    }
  } catch {}
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function createUser(name, email, password) {
  const id = crypto.randomUUID();
  const salt = crypto.randomBytes(16).toString('hex');
  const password_hash = hashPassword(password, salt);
  try {
    authDb.prepare('INSERT INTO users (id, name, email, password_hash, salt) VALUES (?,?,?,?,?)').run(id, name, email, password_hash, salt);
    return { id, name, email };
  } catch (e) {
    if (e.message.includes('UNIQUE')) throw new Error('Email already registered');
    throw e;
  }
}

function loginUser(email, password) {
  const user = authDb.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) throw new Error('Invalid credentials');
  if (hashPassword(password, user.salt) !== user.password_hash) throw new Error('Invalid credentials');
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 7 * 86400000).toISOString();
  authDb.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?,?,?)').run(token, user.id, expires);
  return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
}

function parseCookies(req) {
  const cookies = {};
  (req.headers.cookie || '').split(';').forEach(c => {
    const [k, v] = c.trim().split('=');
    if (k) cookies[k] = v;
  });
  return cookies;
}

function setAuthCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `sv_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${7 * 86400}${secure}`);
}

function clearAuthCookie(res) {
  res.setHeader('Set-Cookie', 'sv_session=; HttpOnly; Path=/; Max-Age=0');
}

function authMiddleware(req) {
  let token = null;
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    token = auth.slice(7);
  } else {
    token = parseCookies(req).sv_session;
  }
  if (!token) return null;
  const session = authDb.prepare('SELECT s.*, u.name, u.email, u.role FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > datetime(\'now\')').get(token);
  if (!session) return null;
  return { id: session.user_id, name: session.name, email: session.email, role: session.role };
}

module.exports = {
  authDb,
  geolocateIP,
  createUser,
  loginUser,
  setAuthCookie,
  clearAuthCookie,
  authMiddleware
};
