/**
 * OpenClaw Bridge — HTTP→OpenClaw gateway for Dashboard Chat
 * 
 * Endpoints:
 *   POST /api/chat    — Send message to Kira via OpenClaw, stream SSE response
 *   GET  /api/history — Get recent OpenClaw session history
 *   GET  /api/health  — Health check
 *
 * Uses OpenClaw's WebSocket protocol (ACP) to inject messages and stream responses.
 */

import http from 'node:http';
import { spawn } from 'node:child_process';

const PORT = parseInt(process.env.BRIDGE_PORT || '3855');
const TOKEN = process.env.BRIDGE_TOKEN || 'kira-bridge-2024';
const OPENCLAW_BIN = process.env.OPENCLAW_BIN || 'openclaw';

function auth(req) {
  const h = req.headers.authorization || '';
  return h === `Bearer ${TOKEN}`;
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(data)); } catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

/**
 * Stream a chat message through openclaw agent CLI.
 * The CLI handles session management, tool use, everything.
 * We just capture stdout and stream it as SSE.
 */
async function handleChat(req, res) {
  const body = await readBody(req);
  const message = body.message;
  if (!message) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'message required' }));
    return;
  }

  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const prefix = body.prefix || '[WebUI] ';
  const fullMessage = `${prefix}${message}`;

  console.log(`[bridge] Kira route — spawning openclaw agent, msgLen=${message.length}`);

  // Spawn openclaw agent targeting the main session
  const sessionId = body.sessionId || 'main';
  const proc = spawn(OPENCLAW_BIN, [
    'agent',
    '-m', fullMessage,
    '--session-id', sessionId,
    '--json',
  ], {
    env: { ...process.env, NO_COLOR: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 180_000,
  });

  let stdout = '';
  let stderr = '';

  proc.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });

  proc.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  // Keep-alive while agent runs
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'keepalive' })}\n\n`);
  }, 5000);

  proc.on('close', (code) => {
    clearInterval(heartbeat);
    console.log(`[bridge] openclaw agent done — code=${code} len=${stdout.length}`);

    // Parse --json output: { status, summary, result: { payloads: [{ content }], meta } }
    let finalContent = '';
    try {
      const parsed = JSON.parse(stdout);
      if (parsed.result?.payloads) {
        // Extract text from all payloads
        finalContent = parsed.result.payloads
          .map(p => p.content || p.text || '')
          .filter(Boolean)
          .join('\n\n');
      }
      if (!finalContent && parsed.summary) finalContent = parsed.summary;
    } catch {
      // Fallback: stdout is raw text
      finalContent = stdout;
    }

    if (code !== 0 && !finalContent) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: stderr || `Exit code ${code}` })}\n\n`);
    } else if (finalContent) {
      // Send as delta first (for streaming UI), then as final
      res.write(`data: ${JSON.stringify({ type: 'delta', content: finalContent })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'assistant_message', content: finalContent })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  });

  proc.on('error', (err) => {
    console.error(`[bridge] spawn error:`, err.message);
    res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  });

  // Client disconnect cleanup
  req.on('close', () => {
    if (!proc.killed) proc.kill('SIGTERM');
  });
}

/**
 * Get session history from OpenClaw
 */
async function handleHistory(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const limit = parseInt(url.searchParams.get('limit') || '50');

  try {
    const proc = spawn(OPENCLAW_BIN, ['sessions', 'history', '--json', '--limit', String(limit)], {
      env: { ...process.env, NO_COLOR: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 10_000,
    });

    let stdout = '';
    proc.stdout.on('data', chunk => stdout += chunk);

    proc.on('close', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      try {
        const data = JSON.parse(stdout);
        res.end(JSON.stringify({ data }));
      } catch {
        res.end(JSON.stringify({ data: [], raw: stdout.slice(0, 500) }));
      }
    });
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

const server = http.createServer(async (req, res) => {
  cors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (!auth(req)) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, bridge: 'openclaw-bridge', version: '2.0' }));
    return;
  }

  if (url.pathname === '/api/chat' && req.method === 'POST') {
    try {
      await handleChat(req, res);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (url.pathname === '/api/history' && req.method === 'GET') {
    await handleHistory(req, res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`[bridge] OpenClaw bridge running on port ${PORT}`);
});
