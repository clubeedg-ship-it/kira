#!/usr/bin/env node
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  const errors = [];
  const sseLogs = [];
  page.on('console', msg => {
    const txt = msg.text();
    if (msg.type() === 'error') errors.push(txt);
    if (txt.includes('[SSE]') || txt.includes('sse')) sseLogs.push(txt);
  });
  page.on('pageerror', err => errors.push(`PAGE_ERROR: ${err.message}`));

  const BASE = 'http://localhost:3847';
  
  // Login
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.click('text=Login');
  await page.waitForTimeout(500);
  await page.fill('input[type="email"], input[name="email"]', 'otto@oopuo.com');
  await page.fill('input[type="password"]', 'test1234');
  await page.click('button:has-text("Sign In")');
  await page.waitForTimeout(3000);
  
  // Navigate to chat (scratchpad)
  await page.click('[data-page="scratchpad"]');
  await page.waitForTimeout(3000);
  
  // Check state
  let msgCount = await page.$$eval('.msg-row', els => els.length).catch(() => -1);
  const sseState = await page.evaluate(() => ({
    sseConnected: !!window.sseConnected,
    hasChatES: !!window.chatEventSource,
    readyState: window.chatEventSource?.readyState, // 0=connecting, 1=open, 2=closed
  })).catch(() => ({}));
  
  console.log(`Messages: ${msgCount}, SSE: ${JSON.stringify(sseState)}`);
  
  // Check SSE badge
  const badge = await page.$eval('#sse-badge', el => el.textContent).catch(() => 'no badge');
  console.log(`SSE Badge: "${badge}"`);
  
  // Screenshot
  await page.screenshot({ path: '/tmp/webui-e2e-chat.png', fullPage: false });
  
  // Check for the last few messages
  const lastMsgs = await page.$$eval('.msg-row', rows => {
    return rows.slice(-5).map(r => ({
      dir: r.classList.contains('out') ? 'out' : 'in',
      text: r.querySelector('.msg-text')?.textContent?.substring(0, 80) || '(no text)',
    }));
  }).catch(() => []);
  console.log('Last 5 messages:');
  lastMsgs.forEach(m => console.log(`  [${m.dir}] ${m.text}`));

  // Wait 15s, count any SSE events
  console.log('\nWatching SSE for 10s...');
  const events = await page.evaluate(() => {
    return new Promise(resolve => {
      const evts = [];
      if (!window.chatEventSource) { resolve(['no_event_source']); return; }
      const orig = window.chatEventSource.onmessage;
      window.chatEventSource.onmessage = (e) => {
        try { evts.push(JSON.parse(e.data).type); } catch {}
        if (orig) orig(e);
      };
      setTimeout(() => {
        window.chatEventSource.onmessage = orig;
        resolve(evts);
      }, 10000);
    });
  });
  console.log(`SSE events received: ${JSON.stringify(events)}`);
  
  console.log(`\nErrors: ${errors.length}`);
  errors.slice(0, 5).forEach(e => console.log(`  ❌ ${e.substring(0, 150)}`));
  console.log(`SSE logs: ${sseLogs.length}`);
  sseLogs.forEach(l => console.log(`  ${l}`));
  
  await browser.close();
})();
