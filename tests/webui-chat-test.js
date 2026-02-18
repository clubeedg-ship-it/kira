#!/usr/bin/env node
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(`PAGE_ERROR: ${err.message}`));

  const BASE = 'http://localhost:3847';
  
  console.log('=== 1. Load & Login ===');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  
  // Click Login link on splash
  await page.click('text=Login');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/webui-2-loginform.png' });
  
  // Fill login
  await page.fill('input[type="email"], input[name="email"]', 'otto@oopuo.com');
  await page.fill('input[type="password"]', 'test1234');
  await page.click('button:has-text("Sign In")');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/webui-3-dashboard.png' });
  console.log('  Logged in');

  // Navigate to chat
  console.log('=== 2. Navigate to Chat ===');
  const chatLink = await page.$('[data-page="chat"], .nav-item:has-text("Chat"), a:has-text("Chat")');
  if (chatLink) {
    await chatLink.click();
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: '/tmp/webui-4-chat-initial.png' });

  // Count messages
  let msgCount = await page.$$eval('.msg-row', els => els.length).catch(() => -1);
  console.log(`  Initial messages visible: ${msgCount}`);

  // Check SSE
  const sseState = await page.evaluate(() => ({
    sseConnected: !!window.sseConnected,
    hasChatEventSource: !!window.chatEventSource,
  })).catch(() => ({ error: 'eval failed' }));
  console.log(`  SSE:`, JSON.stringify(sseState));

  // Measure API call time
  console.log('=== 3. Measure API ===');
  const apiResult = await page.evaluate(async () => {
    const token = localStorage.getItem('token');
    if (!token) return { error: 'no token', keys: Object.keys(localStorage) };
    const t = Date.now();
    const res = await fetch('/api/chat?limit=200', { headers: { Authorization: 'Bearer ' + token } });
    const data = await res.json();
    return { ms: Date.now() - t, status: res.status, count: Array.isArray(data) ? data.length : 'N/A' };
  }).catch(e => ({ error: e.message }));
  console.log(`  API:`, JSON.stringify(apiResult));

  // Measure render time
  console.log('=== 4. Measure Render ===');
  const renderResult = await page.evaluate(async () => {
    const token = localStorage.getItem('token');
    if (!token) return { error: 'no token' };
    const res = await fetch('/api/chat?limit=200', { headers: { Authorization: 'Bearer ' + token } });
    const msgs = await res.json();
    if (!Array.isArray(msgs)) return { error: 'bad data' };
    
    // Check for huge messages
    const bigOnes = msgs.filter(m => (m.content||'').length > 5000).map(m => ({
      id: m.messageId, from: m.from, len: (m.content||'').length, blocks: (m.blocks||[]).length
    }));
    
    const t = Date.now();
    try {
      renderScratchMessages(msgs, true);
    } catch(e) {
      return { error: e.message, stack: e.stack?.substring(0, 500) };
    }
    return { renderMs: Date.now() - t, count: msgs.length, bigMessages: bigOnes };
  }).catch(e => ({ error: e.message }));
  console.log(`  Render:`, JSON.stringify(renderResult));

  // After render, count DOM messages
  msgCount = await page.$$eval('.msg-row', els => els.length).catch(() => -1);
  console.log(`  DOM messages after render: ${msgCount}`);
  
  await page.screenshot({ path: '/tmp/webui-5-afterrender.png' });

  // Wait 10s and check if SSE delivers anything
  console.log('=== 5. SSE Watch (10s) ===');
  const sseEvents = await page.evaluate(() => {
    return new Promise(resolve => {
      const events = [];
      const orig = window.chatEventSource;
      if (!orig) { resolve(['no_sse']); return; }
      const handler = (e) => {
        try { events.push(JSON.parse(e.data).type); } catch {}
      };
      orig.addEventListener('message', handler);
      setTimeout(() => {
        orig.removeEventListener('message', handler);
        resolve(events);
      }, 10000);
    });
  }).catch(e => [e.message]);
  console.log(`  SSE events in 10s:`, JSON.stringify(sseEvents));

  console.log('\n=== Console Errors ===');
  errors.forEach(e => console.log(`  ❌ ${e.substring(0, 200)}`));
  if (!errors.length) console.log('  ✅ No errors');
  
  await browser.close();
})();
