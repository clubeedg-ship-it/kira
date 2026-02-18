#!/usr/bin/env node
// Sync a message to the Kira Dashboard chat
// Usage: node chat-sync.js '{"from":"otto","content":"hello","type":"text"}'
const http = require('http');
const msg = JSON.parse(process.argv[2] || '{}');
if (!msg.content) { console.error('No content'); process.exit(1); }

const data = JSON.stringify({
  from: msg.from || 'kira',
  type: msg.type || 'text', 
  content: msg.content,
  messageId: msg.messageId,
  ts: msg.ts || new Date().toISOString()
});

const req = http.request({
  hostname: 'localhost', port: 3847, path: '/api/chat/sync',
  method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
}, res => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => { console.log(body); process.exit(0); });
});
req.on('error', e => { console.error(e.message); process.exit(1); });
req.write(data);
req.end();
