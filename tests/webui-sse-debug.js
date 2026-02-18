#!/usr/bin/env node
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  // Intercept SSE requests
  page.on('request', req => {
    if (req.url().includes('events') || req.url().includes('stream')) {
      console.log(`[NET] ${req.method()} ${req.url()}`);
    }
  });
  page.on('response', res => {
    if (res.url().includes('events') || res.url().includes('stream')) {
      console.log(`[NET] Response ${res.status()} ${res.url()}`);
    }
  });
  page.on('requestfailed', req => {
    if (req.url().includes('events') || req.url().includes('stream')) {
      console.log(`[NET] FAILED ${req.url()} - ${req.failure()?.errorText}`);
    }
  });
  
  const allLogs = [];
  page.on('console', msg => allLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => allLogs.push(`[PAGE_ERROR] ${err.message}`));

  const BASE = 'http://localhost:3847';
  
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.click('text=Login');
  await page.waitForTimeout(500);
  await page.fill('input[type="email"], input[name="email"]', 'otto@oopuo.com');
  await page.fill('input[type="password"]', 'test1234');
  await page.click('button:has-text("Sign In")');
  await page.waitForTimeout(2000);
  
  console.log('\n=== Post-login, checking SSE ===');
  
  // Navigate to chat
  await page.click('[data-page="scratchpad"]');
  await page.waitForTimeout(5000);
  
  const state = await page.evaluate(() => {
    return {
      token: localStorage.getItem('kira_token')?.substring(0, 30) + '...',
      sseConnected: window.sseConnected,
      hasChatES: !!window.chatEventSource,
      readyState: window.chatEventSource?.readyState,
      msgCount: document.querySelectorAll('.msg-row').length,
      badge: document.getElementById('sse-badge')?.textContent,
    };
  });
  console.log('State:', JSON.stringify(state, null, 2));
  
  // Try manual SSE connection  
  console.log('\n=== Manual SSE test ===');
  const manualSSE = await page.evaluate(() => {
    return new Promise(resolve => {
      const token = localStorage.getItem('kira_token');
      const es = new EventSource('/api/chat/events?token=' + encodeURIComponent(token));
      const result = { events: [], errors: 0, opened: false };
      es.onopen = () => { result.opened = true; };
      es.onmessage = (e) => { try { result.events.push(JSON.parse(e.data).type); } catch {} };
      es.onerror = () => { result.errors++; };
      setTimeout(() => { es.close(); resolve(result); }, 5000);
    });
  });
  console.log('Manual SSE:', JSON.stringify(manualSSE));
  
  console.log('\n=== All console logs ===');
  allLogs.forEach(l => console.log(`  ${l.substring(0, 150)}`));
  
  await browser.close();
})();
