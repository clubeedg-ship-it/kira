#!/usr/bin/env node
/**
 * Output Processor
 * 
 * Reads pending agent outputs from ~/kira/agents/outputs/
 * Routes them to the right destination:
 * - decisions → formatted message to Otto via Telegram
 * - documents → saved to ~/kira/vdr/{category}/
 * - tasks → logged + summarized for Otto
 * - facts → stored for knowledge graph
 * - alerts → immediate notification
 * 
 * Usage: node processor.js
 */

import fs from 'fs/promises';
import path from 'path';

const OUTPUTS_DIR = '/home/adminuser/kira/agents/outputs';
const VDR_DIR = '/home/adminuser/kira/vdr';
const ARCHIVE_DIR = path.join(OUTPUTS_DIR, 'processed');

async function processOutputs() {
  await fs.mkdir(ARCHIVE_DIR, { recursive: true });
  
  const files = await fs.readdir(OUTPUTS_DIR);
  const pending = files.filter(f => f.endsWith('.json') && !f.startsWith('.'));
  
  if (pending.length === 0) {
    console.log('No pending outputs.');
    return { decisions: [], documents: [], tasks: [], facts: [], alerts: [] };
  }
  
  const results = { decisions: [], documents: [], tasks: [], facts: [], alerts: [] };
  
  for (const file of pending) {
    try {
      const raw = await fs.readFile(path.join(OUTPUTS_DIR, file), 'utf8');
      const output = JSON.parse(raw);
      
      switch (output.type) {
        case 'decision':
          results.decisions.push(await processDecision(output, file));
          break;
        case 'document':
          results.documents.push(await processDocument(output, file));
          break;
        case 'task':
          results.tasks.push(await processTask(output, file));
          break;
        case 'fact':
          results.facts.push(await processFact(output, file));
          break;
        case 'alert':
          results.alerts.push(await processAlert(output, file));
          break;
        default:
          console.warn(`Unknown output type: ${output.type} in ${file}`);
      }
      
      // Archive
      await fs.rename(
        path.join(OUTPUTS_DIR, file),
        path.join(ARCHIVE_DIR, `${Date.now()}-${file}`)
      );
    } catch (e) {
      console.error(`Error processing ${file}:`, e.message);
    }
  }
  
  return results;
}

async function processDecision(output, file) {
  const d = output.decision;
  const agent = output.agent || 'unknown';
  return {
    agent,
    question: d.question,
    recommendation: d.recommendation,
    urgency: d.urgency || 'whenever',
    options: d.options?.map(o => o.label) || [],
    file
  };
}

async function processDocument(output, file) {
  const doc = output.document;
  const category = doc.category || 'general';
  const dir = path.join(VDR_DIR, category);
  await fs.mkdir(dir, { recursive: true });
  
  const filename = doc.filename || `${output.agent}-${Date.now()}.md`;
  await fs.writeFile(path.join(dir, filename), doc.content);
  
  return {
    agent: output.agent,
    title: doc.title,
    path: path.join(dir, filename),
    file
  };
}

async function processTask(output, file) {
  const t = output.task;
  return {
    agent: output.agent,
    title: t.title,
    priority: t.priority,
    assignee: t.assignee || 'user',
    project: t.project,
    description: t.description?.substring(0, 200),
    file
  };
}

async function processFact(output, file) {
  const f = output.fact;
  return {
    agent: output.agent,
    entity: f.entity,
    key: f.key,
    value: f.value,
    confidence: f.confidence,
    file
  };
}

async function processAlert(output, file) {
  const a = output.alert;
  return {
    agent: output.agent,
    severity: a.severity,
    message: a.message,
    action: a.action,
    file
  };
}

function formatForOtto(results) {
  let msg = '';
  
  if (results.alerts.length) {
    msg += '🚨 ALERTS\n';
    for (const a of results.alerts) {
      msg += `  ${a.severity === 'critical' ? '🔴' : '🟡'} [${a.agent}] ${a.message}\n`;
      if (a.action) msg += `  → ${a.action}\n`;
    }
    msg += '\n';
  }
  
  if (results.decisions.length) {
    msg += '📋 DECISIONS NEEDED\n';
    for (const d of results.decisions) {
      const urgIcon = { now: '🔴', today: '🟠', this_week: '🟡', whenever: '⚪' }[d.urgency] || '⚪';
      msg += `  ${urgIcon} [${d.agent}] ${d.question}\n`;
      msg += `  → Rec: ${d.recommendation.substring(0, 150)}\n`;
      if (d.options.length) msg += `  Options: ${d.options.join(' | ')}\n`;
      msg += '\n';
    }
  }
  
  if (results.tasks.length) {
    msg += '✅ TASKS\n';
    for (const t of results.tasks) {
      const pIcon = { critical: '🔴', high: '🟠', medium: '🟡', low: '⚪' }[t.priority] || '⚪';
      msg += `  ${pIcon} [${t.agent}] ${t.title}\n`;
    }
    msg += '\n';
  }
  
  if (results.documents.length) {
    msg += '📄 DOCUMENTS\n';
    for (const d of results.documents) {
      msg += `  [${d.agent}] ${d.title} → ${d.path}\n`;
    }
    msg += '\n';
  }
  
  if (results.facts.length) {
    msg += `📊 ${results.facts.length} facts extracted for knowledge graph\n`;
  }
  
  return msg.trim();
}

// Run
const results = await processOutputs();
const summary = formatForOtto(results);

if (summary) {
  console.log('\n' + summary);
  
  // Write summary for Kira to send
  await fs.writeFile(
    path.join(OUTPUTS_DIR, '.last-summary.txt'),
    summary
  );
} else {
  console.log('Nothing to process.');
}
