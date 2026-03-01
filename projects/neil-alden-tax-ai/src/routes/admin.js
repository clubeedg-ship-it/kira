/**
 * Admin API routes
 */
const fs = require('fs');
const { authDb } = require('../auth');
const { parseBody } = require('../http-helpers');
const { bruteForceMap, rateLimitMap, ACCESS_LOG, SECURITY_LOG } = require('../security');

function handleAdminRoutes(url, req, res, json, user) {
  if (!user || user.role !== 'admin') return json(403, { error: 'Admin required' });

  if (url.pathname === '/api/admin/dashboard' && req.method === 'GET') {
    const totalUsers = authDb.prepare('SELECT COUNT(*) as c FROM users').get().c;
    const activeToday = authDb.prepare("SELECT COUNT(DISTINCT user_id) as c FROM sessions WHERE created_at >= date('now')").get().c;
    const activeLast7d = authDb.prepare("SELECT COUNT(DISTINCT user_id) as c FROM sessions WHERE created_at >= date('now', '-7 days')").get().c;
    const totalOpinions = authDb.prepare('SELECT COUNT(*) as c FROM opinions').get().c;
    const opinionsToday = authDb.prepare("SELECT COUNT(*) as c FROM opinions WHERE created_at >= date('now')").get().c;
    const opinionsLast7d = authDb.prepare("SELECT COUNT(*) as c FROM opinions WHERE created_at >= date('now', '-7 days')").get().c;
    const openReports = authDb.prepare("SELECT COUNT(*) as c FROM support_reports WHERE status = 'open'").get().c;
    const totalMessages = authDb.prepare('SELECT COUNT(*) as c FROM support_messages').get().c;
    const topCountries = authDb.prepare("SELECT country, COUNT(*) as count FROM opinions WHERE country != '' GROUP BY country ORDER BY count DESC LIMIT 10").all();
    const totalCost = authDb.prepare('SELECT COALESCE(SUM(cost_usd),0) as c FROM usage_logs').get().c;
    const totalTokens = authDb.prepare('SELECT COALESCE(SUM(input_tokens),0) as inp, COALESCE(SUM(output_tokens),0) as out FROM usage_logs').get();
    const userLocations = authDb.prepare("SELECT name, email, last_location, last_ip, last_active FROM users WHERE last_location IS NOT NULL AND last_location != '' ORDER BY last_active DESC").all();
    const recentActivity = authDb.prepare(`
      SELECT u.name as user_name, 'opinion' as action, o.title as detail, o.created_at as time, u.last_location as location
      FROM opinions o JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC LIMIT 20
    `).all();
    return json(200, {
      users: { total: totalUsers, activeToday, activeLast7d },
      opinions: { total: totalOpinions, today: opinionsToday, last7d: opinionsLast7d },
      support: { openReports, totalMessages },
      usage: { totalCost, inputTokens: totalTokens.inp, outputTokens: totalTokens.out },
      topCountries, userLocations, recentActivity
    });
  }

  if (url.pathname === '/api/admin/users' && req.method === 'GET') {
    const users = authDb.prepare(`
      SELECT u.id, u.name, u.email, u.role, u.created_at, u.last_ip, u.last_location, u.last_active,
        (SELECT COUNT(*) FROM opinions WHERE user_id = u.id) as opinion_count,
        (SELECT COALESCE(SUM(cost_usd),0) FROM usage_logs WHERE user_id = u.id) as total_cost
      FROM users u ORDER BY u.created_at DESC
    `).all();
    return json(200, { users });
  }

  const userMatch = url.pathname.match(/^\/api\/admin\/users\/([\w-]+)$/);
  if (userMatch && req.method === 'GET') {
    const u = authDb.prepare('SELECT id, name, email, role, created_at, last_ip, last_location, last_active FROM users WHERE id = ?').get(userMatch[1]);
    if (!u) return json(404, { error: 'User not found' });
    const opinions = authDb.prepare('SELECT id, title, client_name, country, created_at FROM opinions WHERE user_id = ? ORDER BY created_at DESC').all(u.id);
    const supportCount = authDb.prepare('SELECT COUNT(*) as c FROM support_messages WHERE user_id = ?').get(u.id).c;
    return json(200, { ...u, opinions, support_messages_count: supportCount });
  }
  if (userMatch && req.method === 'PATCH') {
    return (async () => {
      const body = await parseBody(req);
      if (body.role) authDb.prepare('UPDATE users SET role = ? WHERE id = ?').run(body.role, userMatch[1]);
      return json(200, { ok: true });
    })();
  }

  if (url.pathname === '/api/admin/opinions' && req.method === 'GET') {
    const opinions = authDb.prepare(`
      SELECT o.id, o.title, o.client_name, o.country, u.name as user_name, u.email as user_email, o.created_at
      FROM opinions o JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC
    `).all();
    return json(200, { opinions });
  }

  const opMatch = url.pathname.match(/^\/api\/admin\/opinions\/([\w-]+)$/);
  if (opMatch && req.method === 'GET') {
    const op = authDb.prepare(`
      SELECT o.*, u.name as user_name, u.email as user_email
      FROM opinions o JOIN users u ON o.user_id = u.id WHERE o.id = ?
    `).get(opMatch[1]);
    if (!op) return json(404, { error: 'Not found' });
    op.form_data = JSON.parse(op.form_data || '{}');
    op.sources = JSON.parse(op.sources || '[]');
    op.treaty_analysis = JSON.parse(op.treaty_analysis || '{}');
    return json(200, op);
  }

  if (url.pathname === '/api/admin/reports' && req.method === 'GET') {
    const reports = authDb.prepare(`
      SELECT r.*, u.name as user_name, u.email as user_email
      FROM support_reports r JOIN users u ON r.user_id = u.id ORDER BY r.created_at DESC
    `).all();
    const conversations = authDb.prepare(`
      SELECT u.id as user_id, u.name as user_name, u.email as user_email, u.last_location,
        COUNT(*) as message_count,
        MAX(m.created_at) as last_message,
        MIN(m.created_at) as first_message
      FROM support_messages m JOIN users u ON m.user_id = u.id
      GROUP BY m.user_id ORDER BY last_message DESC
    `).all();
    return json(200, { reports, conversations });
  }

  const supportTranscriptMatch = url.pathname.match(/^\/api\/admin\/support\/([\w-]+)$/);
  if (supportTranscriptMatch && req.method === 'GET') {
    const msgs = authDb.prepare('SELECT role, content, image, created_at FROM support_messages WHERE user_id = ? ORDER BY created_at ASC').all(supportTranscriptMatch[1]);
    return json(200, { messages: msgs });
  }

  const reportMatch = url.pathname.match(/^\/api\/admin\/reports\/(\d+)$/);
  if (reportMatch && req.method === 'PATCH') {
    return (async () => {
      const body = await parseBody(req);
      if (body.status) authDb.prepare('UPDATE support_reports SET status = ? WHERE id = ?').run(body.status, reportMatch[1]);
      return json(200, { ok: true });
    })();
  }

  if (url.pathname === '/api/admin/usage' && req.method === 'GET') {
    const totals = authDb.prepare('SELECT COALESCE(SUM(cost_usd),0) as totalCost, COALESCE(SUM(input_tokens),0) as input, COALESCE(SUM(output_tokens),0) as output FROM usage_logs').get();
    const byUser = authDb.prepare(`
      SELECT u.name as user_name, COALESCE(SUM(l.cost_usd),0) as cost, COUNT(*) as opinions
      FROM usage_logs l JOIN users u ON l.user_id = u.id GROUP BY l.user_id ORDER BY cost DESC
    `).all();
    const byDay = authDb.prepare(`
      SELECT date(created_at) as date, COALESCE(SUM(cost_usd),0) as cost, COUNT(*) as requests
      FROM usage_logs GROUP BY date(created_at) ORDER BY date DESC LIMIT 30
    `).all();
    const byAction = authDb.prepare(`
      SELECT action, COUNT(*) as count, COALESCE(SUM(cost_usd),0) as cost
      FROM usage_logs GROUP BY action ORDER BY cost DESC
    `).all();
    return json(200, {
      totalCost: totals.totalCost,
      totalTokens: { input: totals.input, output: totals.output },
      byUser, byDay, byAction
    });
  }

  if (url.pathname === '/api/admin/security' && req.method === 'GET') {
    const blockedIPs = [];
    const now = Date.now();
    for (const [ip, entry] of bruteForceMap) {
      if (entry.blockedUntil && now < entry.blockedUntil) {
        blockedIPs.push({ ip, blockedUntil: new Date(entry.blockedUntil).toISOString(), failures: entry.failures.length });
      }
    }
    let failedLogins = [];
    try {
      const secContent = fs.readFileSync(SECURITY_LOG, 'utf-8');
      const lines = secContent.split('\n').filter(l => l.includes('LOGIN_FAIL'));
      const cutoff = new Date(Date.now() - 86400000).toISOString();
      failedLogins = lines.filter(l => { const m = l.match(/\[(.*?)\]/); return m && m[1] >= cutoff; })
        .map(l => { const m = l.match(/\[(.*?)\] LOGIN_FAIL IP=(.*?) email=(.*)/); return m ? { time: m[1], ip: m[2], email: m[3] } : null; })
        .filter(Boolean).slice(-100);
    } catch {}
    const requestStats = [];
    for (const [ip, bucket] of rateLimitMap) {
      const total = bucket.auth.length + bucket.api.length;
      if (total > 0) requestStats.push({ ip, auth: bucket.auth.length, api: bucket.api.length, total });
    }
    requestStats.sort((a, b) => b.total - a.total);
    return json(200, { blockedIPs, failedLogins, requestStats: requestStats.slice(0, 20) });
  }

  if (url.pathname === '/api/admin/access-log' && req.method === 'GET') {
    let entries = [];
    try {
      const content = fs.readFileSync(ACCESS_LOG, 'utf-8');
      entries = content.split('\n').filter(Boolean).slice(-50);
    } catch {}
    return json(200, { entries });
  }

  return json(404, { error: 'Admin endpoint not found' });
}

module.exports = { handleAdminRoutes };
