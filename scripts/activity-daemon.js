#!/usr/bin/env node
/**
 * Activity Daemon - Background activity monitor
 * 
 * Runs continuously, monitors session activity, posts updates
 * Run with: node activity-daemon.js &
 */

import https from 'https';
import fs from 'fs';
import path from 'path';

const BOT_TOKEN = '8238580898:AAF0aGxRFJadbspS0VEJLc5g6tH9fLpOVsQ';
const CHAT_ID = '7985502241';
const STATE_FILE = path.join(process.env.HOME, '.kira-activity-state.json');
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  } catch {
    return { lastActivity: Date.now(), lastPost: 0 };
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function sendActivity(message) {
  return new Promise((resolve, reject) => {
    const text = `⚡ ${message}\n\n_${new Date().toLocaleTimeString()}_`;
    
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

async function checkActivity() {
  const state = loadState();
  const now = Date.now();
  
  // Check session logs for recent activity
  const sessionDir = path.join(process.env.HOME, '.clawdbot/agents/main/sessions');
  try {
    const sessions = fs.readdirSync(sessionDir);
    const latestSession = sessions.sort().pop();
    if (latestSession) {
      const logPath = path.join(sessionDir, latestSession, 'log.jsonl');
      const stats = fs.statSync(logPath);
      
      // If log modified in last 5 min, we're active
      if (stats.mtimeMs > now - CHECK_INTERVAL) {
        state.lastActivity = now;
        
        // Post update every 15 min of activity
        if (now - state.lastPost > 15 * 60 * 1000) {
          await sendActivity('Still working... 🔄');
          state.lastPost = now;
        }
      }
    }
  } catch (e) {
    // Ignore errors
  }
  
  saveState(state);
}

// Run check loop
console.log('Activity daemon started');
setInterval(checkActivity, CHECK_INTERVAL);
checkActivity();
