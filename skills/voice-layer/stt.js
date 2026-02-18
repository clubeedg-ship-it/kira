/**
 * STT Module - Speech-to-text via Whisper
 * 
 * Supports:
 * - Local Whisper (via whisper.cpp or whisper-node)
 * - OpenAI Whisper API
 * - On-device iOS Whisper (via Shortcuts bridge)
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const OPENAI_KEY = process.env.OPENAI_API_KEY || 
  (() => {
    try {
      return fs.readFileSync(path.join(process.env.HOME, '.config/openai/api_key'), 'utf8').trim();
    } catch { return null; }
  })();

const MODE = process.env.WHISPER_MODE || 'api'; // 'local', 'api', 'ios'
const LOCAL_MODEL = process.env.WHISPER_MODEL || 'base';

/**
 * Record audio from microphone
 * Returns path to recorded file
 */
export async function recordAudio(options = {}) {
  const duration = options.duration || 10; // seconds
  const outputPath = options.outputPath || `/tmp/recording-${Date.now()}.wav`;
  
  return new Promise((resolve, reject) => {
    // Use sox/rec for recording
    const proc = spawn('rec', [
      outputPath,
      'rate', '16k',
      'channels', '1',
      'trim', '0', String(duration)
    ], { stdio: ['inherit', 'pipe', 'pipe'] });
    
    let stderr = '';
    proc.stderr.on('data', d => stderr += d);
    
    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        resolve(outputPath);
      } else {
        reject(new Error(`Recording failed: ${stderr}`));
      }
    });
    
    proc.on('error', (e) => {
      // sox not available, try arecord
      const arecord = spawn('arecord', [
        '-f', 'S16_LE',
        '-r', '16000',
        '-c', '1',
        '-d', String(duration),
        outputPath
      ]);
      
      arecord.on('close', (code) => {
        if (code === 0) resolve(outputPath);
        else reject(new Error('No recording tool available (sox/arecord)'));
      });
    });
  });
}

/**
 * Transcribe audio file using Whisper API
 */
export async function transcribeWithAPI(audioPath) {
  if (!OPENAI_KEY) {
    throw new Error('OpenAI API key not configured');
  }
  
  const FormData = (await import('form-data')).default;
  const form = new FormData();
  form.append('file', fs.createReadStream(audioPath));
  form.append('model', 'whisper-1');
  form.append('language', 'en');
  
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.openai.com',
      path: '/v1/audio/transcriptions',
      method: 'POST',
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${OPENAI_KEY}`
      }
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.text) {
            resolve(json.text);
          } else {
            reject(new Error(json.error?.message || 'Transcription failed'));
          }
        } catch (e) {
          reject(new Error(`Invalid response: ${data.slice(0, 200)}`));
        }
      });
    });
    
    req.on('error', reject);
    form.pipe(req);
  });
}

/**
 * Transcribe audio file using local Whisper
 */
export async function transcribeLocal(audioPath) {
  return new Promise((resolve, reject) => {
    // Try whisper.cpp first
    const proc = spawn('whisper', [
      audioPath,
      '--model', LOCAL_MODEL,
      '--language', 'en',
      '--output-txt'
    ]);
    
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => stdout += d);
    proc.stderr.on('data', d => stderr += d);
    
    proc.on('close', (code) => {
      if (code === 0) {
        // Read output file
        const txtPath = audioPath.replace(/\.[^.]+$/, '.txt');
        if (fs.existsSync(txtPath)) {
          resolve(fs.readFileSync(txtPath, 'utf8').trim());
        } else {
          resolve(stdout.trim());
        }
      } else {
        reject(new Error(`Local Whisper failed: ${stderr}`));
      }
    });
    
    proc.on('error', () => {
      reject(new Error('Local Whisper not installed'));
    });
  });
}

/**
 * Transcribe using iOS Shortcuts bridge
 * The shortcut should output transcription to a shared file
 */
export async function transcribeIOS(audioPath) {
  const outputPath = path.join(process.env.HOME, '.clawdbot/voice/transcription.txt');
  
  // Wait for iOS to process (via Shortcuts)
  // The shortcut should:
  // 1. Watch for audio file
  // 2. Run Whisper
  // 3. Write transcription to outputPath
  
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 30;
    
    const check = setInterval(() => {
      attempts++;
      
      if (fs.existsSync(outputPath)) {
        const stat = fs.statSync(outputPath);
        // Check if file was modified recently
        if (Date.now() - stat.mtimeMs < 5000) {
          clearInterval(check);
          const text = fs.readFileSync(outputPath, 'utf8').trim();
          fs.unlinkSync(outputPath); // Clean up
          resolve(text);
        }
      }
      
      if (attempts >= maxAttempts) {
        clearInterval(check);
        reject(new Error('iOS transcription timeout'));
      }
    }, 1000);
  });
}

/**
 * Main transcription function
 */
export async function transcribe(audioPath, mode = MODE) {
  switch (mode) {
    case 'api':
      return transcribeWithAPI(audioPath);
    case 'local':
      return transcribeLocal(audioPath);
    case 'ios':
      return transcribeIOS(audioPath);
    default:
      // Try API first, fall back to local
      try {
        return await transcribeWithAPI(audioPath);
      } catch {
        return transcribeLocal(audioPath);
      }
  }
}

/**
 * Listen and transcribe
 */
export async function listen(options = {}) {
  const audioPath = await recordAudio(options);
  const text = await transcribe(audioPath, options.mode);
  
  // Clean up
  try { fs.unlinkSync(audioPath); } catch {}
  
  return text;
}
