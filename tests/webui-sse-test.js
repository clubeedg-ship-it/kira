#!/usr/bin/env node
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  const errors = [];
  const logs = [];
  page.on('console', msg => {
    const txt = msg.text();
    if (msg.type() === 'error') errors.push(txt);
    logs.push(`[${msg.type()}] ${txt.substring(0, 200)}`);
  });
  page.on('pageerror', err => errors.push(`PAGE_ERROR: ${err.message}`));

  // Monitor network requests for SSE
  page.on('requestfailed', req => {
    console.log(`  ❌ Request failed: ${req.url()} - ${req.failure()?.errorText}`);
  });

  const BASE = 'http://localhost:3847';
  
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.click('text=Login');
  await page.waitForTimeout(500);
  await page.fill('input[type="email"], input[name="email"]', 'otto@oopuo.com');
  await page.fill('input[type="password"]', 'test1234');
  await page.click('button:has-text("Sign In")');
  await page.waitForTimeout(3000);
  
  console.log('=== After Login ===');
  const state = await page.evaluate(() => {
    const token = localStorage.getItem('kira_token');
    return {
      hasToken: !!token,
      tokenLen: token?.length,
      sseConnected: !!window.sseConnected,
      hasChatES: !!window.chatEventSource,
      chatESReadyState: window.chatEventSource?.readyState,
    };
  });
  console.log('State:', JSON.stringify(state));

  // Wait more for SSE to establish
  await page.waitForTimeout(5000);
  const state2 = await page.evaluate(() => ({
    sseConnected: !!window.sseConnected,
    hasChatES: !!window.chatEventSource,
    readyState: window.chatEventSource?.readyState,
  }));
  console.log('After 5s:', JSON.stringify(state2));

  // Navigate to chat
  const chatLink = await page.$('[data-page="chat"]');
  if (chatLink) await chatLink.click();
  await page.waitForTimeout(3000);
  
  const state3 = await page.evaluate(() => ({
    sseConnected: !!window.sseConnected,
    hasChatES: !!window.chatEventSource,
    readyState: window.chatEventSource?.readyState,
    msgCount: document.querySelectorAll('.msg-row').length,
  }));
  console.log('After chat nav:', JSON.stringify(state3));

  // Send a test message and measure response time
  console.log('\n=== Send Test Message ===');
  const textarea = await page.$('#scratch-input, textarea');
  if (textarea) {
    await textarea.fill('test ping from playwright');
    const sendBtn = await page.$('#scratch-send, button:has-text("Send")');
    if (sendBtn) {
      const t0 = Date.now();
      await sendBtn.click();
      console.log('  Message sent, waiting for response...');
      
      // Poll for new message from kira
      let found = false;
      for (let i = 0; i < 60; i++) {
        await page.waitForTimeout(1000);
        const lastMsg = await page.evaluate(() => {
          const rows = document.querySelectorAll('.msg-row');
          const last = rows[rows.length - 1];
          return last?.classList.contains('in') ? last.textContent?.substring(0, 100) : null;
        });
        if (lastMsg) {
          console.log(`  ✅ Response in ${Date.now() - t0}ms: ${lastMsg.substring(0, 80)}`);
          found = true;
          break;
        }
        // Check for streaming
        const stream = await page.$('#kira-stream-msg');
        if (stream && !found) {
          console.log(`  🔄 Streaming started at ${Date.now() - t0}ms`);
        }
      }
      if (!found) console.log('  ❌ No response after 60s');
    }
  }

  console.log('\n=== Errors ===');
  errors.forEach(e => console.log(`  ❌ ${e.substring(0, 200)}`));
  console.log('\n=== Relevant Logs ===');
  logs.filter(l => l.includes('sse') || l.includes('SSE') || l.includes('EventSource') || l.includes('error') || l.includes('Error')).forEach(l => console.log(`  ${l}`));

  await browser.close();
})();
