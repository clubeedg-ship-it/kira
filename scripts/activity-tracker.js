#!/usr/bin/env node
/**
 * Activity Tracker - Event-driven activity posting
 * 
 * Call after completing work: node activity-tracker.js "what I did"
 * Posts to Telegram every N events (default: 2)
 */

import https from 'https';
import fs from 'fs';
import path from 'path';

const BOT_TOKEN = '8238580898:AAF0aGxRFJadbspS0VEJLc5g6tH9fLpOVsQ';
const CHAT_ID = '7985502241';
const STATE_FILE = path.join(process.env.HOME, '.kira-activity-tracker.json');
const POST_EVERY_N = 2; // Post every N events

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  } catch {
    return { events: [], count: 0 };
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function sendActivity(events) {
  return new Promise((resolve, reject) => {
    const bullet = events.map(e => `• ${e}`).join('\n');
    const text = `⚡ **Activity Update**\n\n${bullet}`;
    
    const data = JSON.stringify({
      chat_id: CHAT_ID,
      text: text,
      parse_mode: 'Markdown'
    });

    const req = https.request({
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve(body));
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function trackEvent(event) {
  const state = loadState();
  state.events.push(event);
  state.count++;
  
  // Post every N events
  if (state.count >= POST_EVERY_N) {
    await sendActivity(state.events);
    state.events = [];
    state.count = 0;
    console.log('✅ Activity posted');
  } else {
    console.log(`📝 Event tracked (${state.count}/${POST_EVERY_N})`);
  }
  
  saveState(state);
}

// Get event from args
const event = process.argv.slice(2).join(' ');
if (event) {
  trackEvent(event).catch(console.error);
} else {
  console.log('Usage: node activity-tracker.js "what I did"');
}
