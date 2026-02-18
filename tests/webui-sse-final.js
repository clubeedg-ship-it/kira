#!/usr/bin/env node
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  await page.goto('http://localhost:3847', { waitUntil: 'networkidle' });
  await page.click('text=Login');
  await page.waitForTimeout(500);
  await page.fill('input[type="email"], input[name="email"]', 'otto@oopuo.com');
  await page.fill('input[type="password"]', 'test1234');
  await page.click('button:has-text("Sign In")');
  await page.waitForTimeout(2000);
  
  // Go to chat
  await page.click('[data-page="scratchpad"]');
  await page.waitForTimeout(4000);
  
  const state = await page.evaluate(() => ({
    sseConnected: window.sseConnected,
    hasChatES: !!window.chatEventSource,
    readyState: window.chatEventSource?.readyState,
    msgCount: document.querySelectorAll('.msg-row').length,
    badge: document.getElementById('sse-badge')?.textContent,
  }));
  
  console.log('SSE connected:', state.sseConnected);
  console.log('EventSource exists:', state.hasChatES);
  console.log('ReadyState:', state.readyState, '(0=connecting, 1=open, 2=closed)');
  console.log('Messages:', state.msgCount);
  console.log('Badge:', state.badge);
  console.log('Errors:', errors.length ? errors.join('; ') : 'none');
  
  // Success criteria
  const ok = state.hasChatES && state.readyState === 1 && state.msgCount > 0;
  console.log(ok ? '\n✅ SSE working!' : '\n❌ SSE NOT working');
  
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
