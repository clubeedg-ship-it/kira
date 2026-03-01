/**
 * HTTP helpers: serveHtml, serveStatic, json, parseBody, appendVaryHeader, injectNonce, getClientIP
 */
const fs = require('fs');

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['cf-connecting-ip'] || req.socket.remoteAddress || '';
}

function appendVaryHeader(currentValue, value) {
  if (!currentValue) return value;
  const list = String(currentValue).split(',').map(v => v.trim()).filter(Boolean);
  if (!list.includes(value)) list.push(value);
  return list.join(', ');
}

function injectNonceIntoScripts(html, nonce) {
  return html.replace(/<script\b(?![^>]*\bnonce=)/gi, `<script nonce="${nonce}"`);
}

function serveHtml(res, filePath, nonce) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const htmlWithNonce = injectNonceIntoScripts(content, nonce);
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store',
      'Pragma': 'no-cache'
    });
    res.end(htmlWithNonce);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

function serveStatic(res, filePath, contentType) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-cache, no-store', 'Pragma': 'no-cache' });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { reject(new Error('Invalid JSON')); }
    });
  });
}

module.exports = { getClientIP, appendVaryHeader, serveHtml, serveStatic, parseBody };
