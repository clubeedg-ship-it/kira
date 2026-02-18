/**
 * TTS Module - Text-to-speech
 * 
 * Supports:
 * - ElevenLabs (cloud, high quality)
 * - Piper (local, fast, good quality)
 * - espeak (local, instant, robotic)
 * - Coqui XTTS (local, excellent, slower)
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { spawn, execSync } from 'child_process';

// Config
const TTS_MODE = process.env.TTS_MODE || 'auto'; // 'elevenlabs', 'piper', 'espeak', 'coqui', 'auto'

const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY || 
  (() => {
    try {
      return fs.readFileSync(path.join(process.env.HOME, '.config/elevenlabs/api_key'), 'utf8').trim();
    } catch { return null; }
  })();

const DEFAULT_VOICE = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'; // Sarah
const MODEL = 'eleven_multilingual_v2';

// Piper config
const PIPER_MODEL = process.env.PIPER_MODEL || 'en_US-lessac-medium';
const PIPER_PATH = process.env.PIPER_PATH || 'piper';

export async function textToSpeech(text, options = {}) {
  const voiceId = options.voiceId || DEFAULT_VOICE;
  const outputPath = options.outputPath || `/tmp/tts-${Date.now()}.mp3`;
  
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      text,
      model_id: MODEL,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true
      }
    });
    
    const req = https.request({
      hostname: 'api.elevenlabs.io',
      path: `/v1/text-to-speech/${voiceId}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_KEY,
        'Accept': 'audio/mpeg'
      }
    }, (res) => {
      if (res.statusCode !== 200) {
        let error = '';
        res.on('data', d => error += d);
        res.on('end', () => reject(new Error(`ElevenLabs error ${res.statusCode}: ${error}`)));
        return;
      }
      
      const file = fs.createWriteStream(outputPath);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(outputPath);
      });
    });
    
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

export async function playAudio(filePath) {
  return new Promise((resolve, reject) => {
    // Try different players
    const players = ['afplay', 'mpv', 'ffplay', 'aplay'];
    
    let played = false;
    for (const player of players) {
      try {
        const proc = spawn(player, [filePath], { stdio: 'ignore' });
        proc.on('close', (code) => {
          if (!played) {
            played = true;
            resolve(code === 0);
          }
        });
        proc.on('error', () => {});
        if (player === 'afplay' || player === 'mpv') break; // Prefer these
      } catch (e) {
        continue;
      }
    }
    
    // Timeout
    setTimeout(() => {
      if (!played) {
        played = true;
        resolve(false);
      }
    }, 30000);
  });
}

export async function speak(text, options = {}) {
  try {
    const audioPath = await textToSpeech(text, options);
    
    if (options.play !== false) {
      await playAudio(audioPath);
    }
    
    return audioPath;
  } catch (e) {
    console.error('TTS error:', e.message);
    return null;
  }
}

export async function summarizeAndSpeak(text, options = {}) {
  // For long texts, summarize first
  const maxLength = options.maxLength || 500;
  
  let toSpeak = text;
  if (text.length > maxLength) {
    // Simple truncation for MVP - could use LLM summarization
    toSpeak = text.slice(0, maxLength) + '...';
  }
  
  return speak(toSpeak, options);
}

/**
 * Piper TTS (local, fast)
 * Install: pip install piper-tts
 * Or download binary from: https://github.com/rhasspy/piper/releases
 */
export async function textToSpeechPiper(text, options = {}) {
  const outputPath = options.outputPath || `/tmp/tts-${Date.now()}.wav`;
  const model = options.model || PIPER_MODEL;
  
  return new Promise((resolve, reject) => {
    // Piper reads from stdin
    const proc = spawn(PIPER_PATH, [
      '--model', model,
      '--output_file', outputPath
    ]);
    
    proc.stdin.write(text);
    proc.stdin.end();
    
    let stderr = '';
    proc.stderr.on('data', d => stderr += d);
    
    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        resolve(outputPath);
      } else {
        reject(new Error(`Piper failed: ${stderr}`));
      }
    });
    
    proc.on('error', () => {
      reject(new Error('Piper not installed. Run: pip install piper-tts'));
    });
  });
}

/**
 * espeak TTS (local, instant, robotic)
 * Usually pre-installed on Linux
 */
export async function textToSpeechEspeak(text, options = {}) {
  const outputPath = options.outputPath || `/tmp/tts-${Date.now()}.wav`;
  
  return new Promise((resolve, reject) => {
    const proc = spawn('espeak', [
      '-w', outputPath,
      '-s', '150', // Speed
      text
    ]);
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error('espeak failed'));
      }
    });
    
    proc.on('error', () => {
      reject(new Error('espeak not installed'));
    });
  });
}

/**
 * Coqui XTTS (local, excellent quality, slower)
 * Install: pip install TTS
 */
export async function textToSpeechCoqui(text, options = {}) {
  const outputPath = options.outputPath || `/tmp/tts-${Date.now()}.wav`;
  
  return new Promise((resolve, reject) => {
    const proc = spawn('tts', [
      '--text', text,
      '--out_path', outputPath,
      '--model_name', 'tts_models/en/ljspeech/tacotron2-DDC'
    ]);
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error('Coqui TTS failed'));
      }
    });
    
    proc.on('error', () => {
      reject(new Error('Coqui TTS not installed. Run: pip install TTS'));
    });
  });
}

/**
 * Auto-select best available TTS
 */
export async function textToSpeechAuto(text, options = {}) {
  const mode = options.mode || TTS_MODE;
  
  // Explicit mode
  if (mode === 'elevenlabs' && ELEVENLABS_KEY) {
    return textToSpeech(text, options);
  }
  if (mode === 'piper') {
    return textToSpeechPiper(text, options);
  }
  if (mode === 'espeak') {
    return textToSpeechEspeak(text, options);
  }
  if (mode === 'coqui') {
    return textToSpeechCoqui(text, options);
  }
  
  // Auto: try in order of quality
  if (ELEVENLABS_KEY) {
    try {
      return await textToSpeech(text, options);
    } catch (e) {
      console.log('ElevenLabs failed, trying local TTS');
    }
  }
  
  // Try Piper
  try {
    return await textToSpeechPiper(text, options);
  } catch (e) {
    console.log('Piper not available, trying espeak');
  }
  
  // Fallback to espeak
  return textToSpeechEspeak(text, options);
}

/**
 * Check available TTS providers
 */
export function getAvailableTTS() {
  const available = [];
  
  if (ELEVENLABS_KEY) available.push('elevenlabs');
  
  try {
    execSync('which piper', { stdio: 'ignore' });
    available.push('piper');
  } catch {}
  
  try {
    execSync('which espeak', { stdio: 'ignore' });
    available.push('espeak');
  } catch {}
  
  try {
    execSync('which tts', { stdio: 'ignore' });
    available.push('coqui');
  } catch {}
  
  return available;
}
