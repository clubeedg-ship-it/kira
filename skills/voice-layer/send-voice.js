#!/usr/bin/env node
/**
 * Send voice message and trigger Kira response
 * 
 * Usage:
 *   node send-voice.js "Tell Kira I checked the website"
 *   echo "message text" | node send-voice.js
 */

import { processVoiceCommand } from './voice-agent.js';

const VOICE_PREFIX = process.env.VOICE_PREFIX || '🎙️ Voice';

// Get input from args or stdin
let voiceInput = process.argv.slice(2).join(' ');

if (!voiceInput) {
  // Read from stdin
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  voiceInput = Buffer.concat(chunks).toString().trim();
}

if (!voiceInput) {
  console.error('Usage: node send-voice.js "your voice transcription"');
  process.exit(1);
}

console.log('Voice input:', voiceInput);

// Process with voice agent
const result = await processVoiceCommand(voiceInput, {});
const crafted = result.crafted || voiceInput;

console.log('Crafted:', crafted);

// Output for piping to clawdbot or other tools
const taggedMessage = `[${VOICE_PREFIX}] ${crafted}`;
console.log('Tagged:', taggedMessage);

// Output JSON for programmatic use
console.log(JSON.stringify({
  original: voiceInput,
  crafted,
  tagged: taggedMessage,
  type: result.type
}));
