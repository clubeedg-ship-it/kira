/**
 * Telegram Bridge - Send/receive messages via Clawdbot
 * 
 * Messages sent appear as if from Otto (not Kira)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const SESSION_DIR = path.join(process.env.HOME, '.clawdbot/agents/main/sessions');
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '7985502241'; // Otto's ID

/**
 * Get latest messages from current session
 */
export function getLatestMessages(count = 10, fromKira = true) {
  try {
    // Find latest session
    const files = fs.readdirSync(SESSION_DIR)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => ({
        name: f,
        path: path.join(SESSION_DIR, f),
        mtime: fs.statSync(path.join(SESSION_DIR, f)).mtimeMs
      }))
      .sort((a, b) => b.mtime - a.mtime);
    
    if (files.length === 0) return [];
    
    const content = fs.readFileSync(files[0].path, 'utf8');
    const lines = content.trim().split('\n').reverse();
    
    const messages = [];
    for (const line of lines) {
      if (messages.length >= count) break;
      
      try {
        const entry = JSON.parse(line);
        
        if (entry.type === 'message' && entry.message) {
          const msg = entry.message;
          const isKira = msg.role === 'assistant';
          
          if (fromKira && !isKira) continue;
          if (!fromKira && isKira) continue;
          
          let text = '';
          if (Array.isArray(msg.content)) {
            text = msg.content.map(c => c.text || '').join('');
          } else if (typeof msg.content === 'string') {
            text = msg.content;
          }
          
          if (text) {
            messages.push({
              role: msg.role,
              content: text,
              timestamp: entry.timestamp
            });
          }
        }
      } catch {
        continue;
      }
    }
    
    return messages.reverse();
  } catch (e) {
    console.error('Error reading messages:', e.message);
    return [];
  }
}

/**
 * Send message to Telegram as Otto (via Clawdbot message tool)
 */
export async function sendAsOtto(message) {
  try {
    // Use Clawdbot's internal messaging
    // This sends to the current channel (Telegram) as a user message
    
    // For now, we'll write to a pending file that gets picked up
    const pendingDir = path.join(process.env.HOME, '.clawdbot/voice/pending');
    fs.mkdirSync(pendingDir, { recursive: true });
    
    const pendingFile = path.join(pendingDir, `${Date.now()}.json`);
    fs.writeFileSync(pendingFile, JSON.stringify({
      type: 'voice_response',
      message,
      timestamp: new Date().toISOString(),
      chatId: TELEGRAM_CHAT_ID
    }));
    
    console.log(`Message queued: ${pendingFile}`);
    
    // Alternative: Direct Telegram API call (if bot token available)
    // This would require the bot token
    
    return { success: true, queued: true };
  } catch (e) {
    console.error('Error sending message:', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Send message directly via Telegram Bot API
 */
export async function sendViaTelegramAPI(message, botToken, chatId) {
  const https = await import('https');
  
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      chat_id: chatId || TELEGRAM_CHAT_ID,
      text: message
    });
    
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${botToken}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.ok ? { success: true } : { success: false, error: json.description });
        } catch {
          reject(new Error('Invalid response'));
        }
      });
    });
    
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

/**
 * Format messages for voice output
 */
export function formatForVoice(messages) {
  return messages.map(m => {
    const time = new Date(m.timestamp).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    });
    return `At ${time}: ${m.content}`;
  }).join('\n\n');
}
