/**
 * LLM: streamGenerate, generateWithLLM
 * Routes through Claude CLI (claude --print) using Claude Max subscription
 */
const { spawn } = require('child_process');
const { LLM_MODEL } = require('./config');

/**
 * Generate text via Claude CLI (non-streaming, returns full text)
 */
function callClaude(prompt, system = '', maxTokens = 8000) {
  return new Promise((resolve, reject) => {
    const args = ['--print', '--model', LLM_MODEL, '--max-tokens', String(maxTokens)];
    if (system) {
      args.push('--system-prompt', system);
    }

    const proc = spawn('claude', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Claude CLI exited ${code}: ${stderr.substring(0, 500)}`));
      } else {
        resolve(stdout);
      }
    });

    proc.on('error', (err) => reject(err));

    proc.stdin.write(prompt);
    proc.stdin.end();
  });
}

/**
 * Streaming generation — spawns claude --print and streams chunks via SSE
 */
async function streamGenerate(prompt, system, res) {
  return new Promise((resolve, reject) => {
    const args = ['--print', '--model', LLM_MODEL, '--max-tokens', '8000'];
    if (system) {
      args.push('--system-prompt', system);
    }

    const proc = spawn('claude', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    let fullText = '';

    proc.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      fullText += text;
      res.write(`data: ${JSON.stringify({ token: text })}\n\n`);
    });

    proc.on('close', (code) => {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      if (code !== 0) {
        resolve({ text: fullText, usage: null });
      } else {
        // Claude CLI doesn't expose token counts, estimate roughly
        const estInput = Math.ceil(prompt.length / 4);
        const estOutput = Math.ceil(fullText.length / 4);
        resolve({
          text: fullText,
          usage: { prompt_tokens: estInput, completion_tokens: estOutput }
        });
      }
    });

    proc.on('error', (err) => {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      reject(err);
    });

    proc.stdin.write(prompt);
    proc.stdin.end();
  });
}

/**
 * Non-streaming fallback
 */
async function generateWithLLM(prompt, system = '') {
  return callClaude(prompt, system);
}

module.exports = { streamGenerate, generateWithLLM };
