/**
 * Auth routes: register, login, logout, me
 */
const { createUser, loginUser, setAuthCookie, clearAuthCookie, authMiddleware } = require('../auth');
const { sanitizeInput, recordLoginSuccess, recordLoginFailure, securityLog } = require('../security');
const { parseBody } = require('../http-helpers');

function handleAuthRoutes(url, req, res, json, clientIP) {
  if (url.pathname === '/api/auth/register' && req.method === 'POST') {
    return (async () => {
      const body = await parseBody(req);
      const name = sanitizeInput(body.name);
      const email = sanitizeInput(body.email);
      const password = body.password;
      if (!name || !email || !password) return json(400, { error: 'Name, email and password required' });
      if (password.length < 8) return json(400, { error: 'Password must be at least 8 characters' });
      try {
        const user = createUser(name, email, password);
        const session = loginUser(email, password);
        setAuthCookie(res, session.token);
        recordLoginSuccess(clientIP);
        return json(201, session);
      } catch (e) { return json(400, { error: e.message }); }
    })();
  }

  if (url.pathname === '/api/auth/login' && req.method === 'POST') {
    return (async () => {
      const { email, password } = await parseBody(req);
      if (!email || !password) return json(400, { error: 'Email and password required' });
      try {
        const session = loginUser(email, password);
        setAuthCookie(res, session.token);
        recordLoginSuccess(clientIP);
        return json(200, session);
      } catch (e) {
        recordLoginFailure(clientIP);
        securityLog(`LOGIN_FAIL IP=${clientIP} email=${email}`);
        return json(401, { error: e.message });
      }
    })();
  }

  if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
    clearAuthCookie(res);
    return json(200, { ok: true });
  }

  if (url.pathname === '/api/auth/me' && req.method === 'GET') {
    const user = authMiddleware(req);
    if (!user) return json(401, { error: 'Not authenticated' });
    return json(200, { user });
  }

  return null; // not handled
}

module.exports = { handleAuthRoutes };
