#!/usr/bin/env node
/**
 * GPU Router — Automatic VRAM time-sharing between Whisper and Ollama.
 * 
 * Port 3853
 * 
 * Routes:
 *   POST /transcribe      → ensures whisper is loaded, proxies to :3852
 *   POST /transcribe-file  → ensures whisper is loaded, proxies to :3852
 *   POST /api/generate     → ensures ollama is loaded, proxies to :11434
 *   POST /api/chat         → ensures ollama is loaded, proxies to :11434
 *   GET  /v1/*             → ensures ollama is loaded, proxies to :11434
 *   POST /v1/*             → ensures ollama is loaded, proxies to :11434
 *   GET  /status           → show current GPU owner
 * 
 * Logic:
 *   - Tracks which service "owns" the GPU
 *   - If request needs the other service, swap:
 *     1. Stop current owner
 *     2. Start requested service
 *     3. Wait for health check
 *     4. Proxy request
 *   - Idle timeout: after 5min of no requests, don't preemptively unload
 */

const http = require('http');
const { exec, execSync } = require('child_process');

const PORT = 3853;
const WHISPER_PORT = 3852;
const OLLAMA_PORT = 11434;

let currentOwner = 'none'; // 'whisper' | 'ollama' | 'none' | 'switching'
let lastRequest = Date.now();
let switchQueue = Promise.resolve();

function log(msg) { console.log(`[gpu-router] ${new Date().toISOString().slice(11,19)} ${msg}`); }

// --- Service control ---

function pm2Action(name, action) {
  return new Promise((resolve, reject) => {
    exec(`pm2 ${action} ${name}`, { timeout: 15000 }, (err) => {
      if (err && action !== 'stop') reject(err);
      else resolve();
    });
  });
}

function dockerAction(name, action) {
  return new Promise((resolve, reject) => {
    exec(`docker ${action} ${name}`, { timeout: 30000 }, (err) => {
      if (err && action !== 'stop') reject(err);
      else resolve();
    });
  });
}

function waitForHealth(port, path, maxWait = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const req = http.get({ hostname: '127.0.0.1', port, path, timeout: 2000 }, res => {
        if (res.statusCode === 200) return resolve();
        if (Date.now() - start > maxWait) return reject(new Error('Health timeout'));
        setTimeout(check, 1000);
      });
      req.on('error', () => {
        if (Date.now() - start > maxWait) return reject(new Error('Health timeout'));
        setTimeout(check, 1000);
      });
    };
    check();
  });
}

async function ensureWhisper() {
  if (currentOwner === 'whisper') return;
  const prev = currentOwner;
  currentOwner = 'switching';
  log(`Switching GPU: ${prev} → whisper`);
  
  if (prev === 'ollama') {
    log('Stopping ollama...');
    await dockerAction('ollama', 'stop').catch(() => {});
    // Wait for VRAM to free
    await new Promise(r => setTimeout(r, 3000));
  }
  
  log('Starting whisper...');
  await pm2Action('whisper', 'restart');
  await waitForHealth(WHISPER_PORT, '/health', 60000);
  currentOwner = 'whisper';
  log('Whisper ready ✓');
}

async function ensureOllama() {
  if (currentOwner === 'ollama') return;
  const prev = currentOwner;
  currentOwner = 'switching';
  log(`Switching GPU: ${prev} → ollama`);
  
  if (prev === 'whisper') {
    log('Stopping whisper...');
    await pm2Action('whisper', 'stop').catch(() => {});
    await new Promise(r => setTimeout(r, 3000));
  }
  
  log('Starting ollama...');
  await dockerAction('ollama', 'start');
  await waitForHealth(OLLAMA_PORT, '/', 30000);
  currentOwner = 'ollama';
  log('Ollama ready ✓');
}

// --- Proxy ---

function proxy(req, res, targetPort) {
  const options = {
    hostname: '127.0.0.1',
    port: targetPort,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${targetPort}` },
    timeout: 120000,
  };
  
  const proxyReq = http.request(options, proxyRes => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  
  proxyReq.on('error', err => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Backend unavailable', detail: err.message }));
  });
  
  req.pipe(proxyReq);
}

// --- Serialized switching ---

function withGpu(service, req, res) {
  lastRequest = Date.now();
  
  switchQueue = switchQueue.then(async () => {
    try {
      if (service === 'whisper') await ensureWhisper();
      else await ensureOllama();
      proxy(req, res, service === 'whisper' ? WHISPER_PORT : OLLAMA_PORT);
    } catch (err) {
      log(`Switch error: ${err.message}`);
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'GPU switch failed', detail: err.message }));
    }
  });
}

// --- Server ---

const server = http.createServer((req, res) => {
  const url = req.url;
  
  // Status
  if (url === '/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      gpuOwner: currentOwner, 
      lastRequest: new Date(lastRequest).toISOString(),
      uptime: process.uptime() | 0
    }));
    return;
  }
  
  // Whisper routes
  if (url.startsWith('/transcribe')) {
    return withGpu('whisper', req, res);
  }
  
  // Ollama routes
  if (url.startsWith('/api/') || url.startsWith('/v1/') || url === '/') {
    return withGpu('ollama', req, res);
  }
  
  res.writeHead(404);
  res.end('Not found');
});

// Detect initial state
try {
  execSync('pm2 jlist', { encoding: 'utf8' });
  const list = JSON.parse(execSync('pm2 jlist', { encoding: 'utf8' }));
  const whisperProc = list.find(p => p.name === 'whisper');
  if (whisperProc && whisperProc.pm2_env.status === 'online') currentOwner = 'whisper';
} catch {}
try {
  const containers = execSync('docker ps --format {{.Names}}', { encoding: 'utf8' });
  if (containers.includes('ollama')) currentOwner = 'ollama';
} catch {}

log(`Initial GPU owner: ${currentOwner}`);

server.listen(PORT, () => log(`GPU Router on http://0.0.0.0:${PORT}`));
