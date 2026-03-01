#!/usr/bin/env node
/**
 * MSTA Tax AI - API Server
 * Parecer Tributário Inteligente
 */
const http = require('http');
const path = require('path');
const crypto = require('crypto');

const { PORT, CORS_ALLOWLIST, normalizeOrigin, LLM_MODEL } = require('./config');
const { checkRateLimit, isBruteForceBlocked, accessLog, buildContentSecurityPolicy } = require('./security');
const { authDb, authMiddleware, geolocateIP } = require('./auth');
const { getClientIP, appendVaryHeader, serveHtml, serveStatic } = require('./http-helpers');
const { handleAuthRoutes } = require('./routes/auth');
const { handleApiRoutes } = require('./routes/api');
const { handleSupportRoutes } = require('./routes/support');
const { handleAdminRoutes } = require('./routes/admin');

const server = http.createServer(async (req, res) => {
  const clientIP = getClientIP(req);
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const requestOrigin = normalizeOrigin(req.headers.origin || '');
  const cspNonce = crypto.randomBytes(16).toString('base64');

  // Security headers
  if (requestOrigin && CORS_ALLOWLIST.has(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Vary', appendVaryHeader(res.getHeader('Vary'), 'Origin'));
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', buildContentSecurityPolicy(cspNonce));

  if (req.method === 'OPTIONS') {
    if (requestOrigin && !CORS_ALLOWLIST.has(requestOrigin)) {
      res.writeHead(403);
      return res.end();
    }
    res.writeHead(204);
    return res.end();
  }

  // Track response status for access log
  const origEnd = res.end.bind(res);
  let logged = false;
  res.end = function(...args) {
    if (!logged) { logged = true; accessLog(clientIP, req.method, url.pathname, res.statusCode || 200); }
    return origEnd(...args);
  };

  const json = (code, data) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };

  // Brute force IP block check
  if (isBruteForceBlocked(clientIP)) {
    return json(403, { error: 'IP temporarily blocked due to too many failed attempts' });
  }

  // Rate limiting
  const isAuthEndpoint = url.pathname.startsWith('/api/auth/login') || url.pathname.startsWith('/api/auth/register');
  if (isAuthEndpoint && !checkRateLimit(clientIP, 'auth')) {
    return json(429, { error: 'Too many requests. Please wait before trying again.' });
  }
  if (url.pathname.startsWith('/api/') && !isAuthEndpoint && !checkRateLimit(clientIP, 'api')) {
    return json(429, { error: 'Too many requests. Please slow down.' });
  }

  try {
    // Block sensitive files
    if (url.pathname.match(/\.(db|sqlite|sql)$/i) || url.pathname.startsWith('/src/') || url.pathname.startsWith('/data/')) {
      res.writeHead(403); return res.end('Forbidden');
    }

    // Static files
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return serveHtml(res, path.join(__dirname, '..', 'ui', 'index.html'), cspNonce);
    }
    if (url.pathname === '/favicon.svg') {
      return serveStatic(res, path.join(__dirname, '..', 'ui', 'favicon.svg'), 'image/svg+xml');
    }
    if (url.pathname.endsWith('.css') || url.pathname.includes('.css')) {
      return serveStatic(res, path.join(__dirname, '..', 'ui', path.basename(url.pathname).split('?')[0]), 'text/css; charset=utf-8');
    }
    if ((url.pathname.endsWith('.js') || url.pathname.includes('.js')) && !url.pathname.startsWith('/api')) {
      return serveStatic(res, path.join(__dirname, '..', 'ui', path.basename(url.pathname).split('?')[0]), 'application/javascript; charset=utf-8');
    }

    // About page (public)
    if (url.pathname === '/about') {
      return serveHtml(res, path.join(__dirname, '..', 'ui', 'about-ottogen.html'), cspNonce);
    }

    // Auth routes (public)
    if (url.pathname.startsWith('/api/auth/')) {
      const result = handleAuthRoutes(url, req, res, json, clientIP);
      if (result !== null) return result;
    }

    // Protected routes need auth
    const user = authMiddleware(req);
    // Track user IP + location on every auth'd request
    if (user) {
      const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['cf-connecting-ip'] || req.socket.remoteAddress || '';
      authDb.prepare('UPDATE users SET last_ip = ?, last_active = datetime(\'now\') WHERE id = ?').run(ip, user.id);
      if (ip && ip !== '127.0.0.1' && ip !== '::1') {
        geolocateIP(ip, user.id).catch(() => {});
      }
    }
    if (url.pathname.startsWith('/api/') && !user) {
      return json(401, { error: 'Authentication required' });
    }

    // Admin page
    if (url.pathname === '/admin' || url.pathname === '/admin/') {
      return serveHtml(res, path.join(__dirname, '..', 'ui', 'admin.html'), cspNonce);
    }

    // Admin API routes
    if (url.pathname.startsWith('/api/admin/')) {
      return handleAdminRoutes(url, req, res, json, user);
    }

    // Support routes
    if (url.pathname.startsWith('/api/support/')) {
      const result = handleSupportRoutes(url, req, res, json, user);
      if (result !== null) return result;
    }

    // API routes
    if (url.pathname.startsWith('/api/')) {
      const result = handleApiRoutes(url, req, res, json, user);
      if (result !== null) return result;
    }

    res.writeHead(404);
    res.end('Not found');
  } catch (e) {
    console.error('Error:', e.message);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
    }
    res.end(JSON.stringify({ error: e.message }));
  }
});

process.on('uncaughtException', (e) => { console.error('Uncaught:', e.message); });
process.on('unhandledRejection', (e) => { console.error('Unhandled:', e); });

server.listen(PORT, () => {
  console.log(`🏛️  MSTA Tax AI running at http://localhost:${PORT}`);
  console.log(`   Model: ${LLM_MODEL}`);
});
