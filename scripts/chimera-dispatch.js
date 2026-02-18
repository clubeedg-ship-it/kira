#!/usr/bin/env node
/**
 * Chimera Dispatch - Process requests and spawn sub-agents
 * 
 * Usage:
 *   node chimera-dispatch.js "Build a weather script" --user=otto --channel=telegram
 * 
 * This script:
 * 1. Processes the request through Chimera Pipeline
 * 2. Returns spawn task parameters for Clawdbot
 * 3. Can be called by Kira to dispatch work to sub-agents
 */

import { Pipeline } from '../../chimera/src/pipeline/index.js';
import fs from 'fs/promises';
import path from 'path';

const DISPATCH_LOG = path.join(process.env.HOME, 'clawd/memory/dispatch-log.json');

async function loadLog() {
  try {
    return JSON.parse(await fs.readFile(DISPATCH_LOG, 'utf8'));
  } catch {
    return { dispatches: [] };
  }
}

async function saveLog(log) {
  await fs.writeFile(DISPATCH_LOG, JSON.stringify(log, null, 2));
}

async function dispatch(message, options = {}) {
  const pipeline = new Pipeline();
  await pipeline.init();

  try {
    // Process through pipeline with spawn task
    const result = await pipeline.processForSpawn(message, {
      user: options.user || 'unknown',
      channel: options.channel || 'direct',
      forceSpawn: true,
      model: options.model || 'sonnet',
      timeout: options.timeout || 120
    });

    // Log dispatch
    const log = await loadLog();
    log.dispatches.push({
      timestamp: new Date().toISOString(),
      jobId: result.jobId,
      message: message.substring(0, 100),
      type: result.classification.type,
      user: options.user
    });
    // Keep last 100 dispatches
    if (log.dispatches.length > 100) {
      log.dispatches = log.dispatches.slice(-100);
    }
    await saveLog(log);

    return result;

  } finally {
    await pipeline.close();
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  let message = '';
  let user = 'otto';
  let channel = 'telegram';
  let model = 'sonnet';
  
  for (const arg of args) {
    if (arg.startsWith('--user=')) {
      user = arg.slice(7);
    } else if (arg.startsWith('--channel=')) {
      channel = arg.slice(10);
    } else if (arg.startsWith('--model=')) {
      model = arg.slice(8);
    } else if (!arg.startsWith('--')) {
      message = arg;
    }
  }

  if (!message) {
    console.error('Usage: chimera-dispatch.js "message" [--user=X] [--channel=X] [--model=X]');
    process.exit(1);
  }

  const result = await dispatch(message, { user, channel, model });
  console.log(JSON.stringify(result, null, 2));
}

main().catch(err => {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
});

export { dispatch };
