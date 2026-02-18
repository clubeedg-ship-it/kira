#!/usr/bin/env node
/**
 * Self-Reflection Loop
 * 
 * Analyzes past episodes to:
 * - Identify patterns in successes and failures
 * - Extract learnings
 * - Update procedures based on outcomes
 * - Generate insights for improvement
 */

const fs = require('fs');
const path = require('path');
const episodes = require('./episodes');
const procedures = require('./procedures');
const blackboard = require('./blackboard');

const REFLECTIONS_DIR = path.join(process.env.HOME, 'clawd/memory/reflections');

if (!fs.existsSync(REFLECTIONS_DIR)) {
  fs.mkdirSync(REFLECTIONS_DIR, { recursive: true });
}

/**
 * Analyze recent episodes and generate insights
 */
function reflect(days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  
  const allEpisodes = episodes.search({ since, limit: 500 });
  const successes = allEpisodes.filter(e => e.outcome === 'success');
  const failures = allEpisodes.filter(e => e.outcome === 'failure');
  const highImportance = allEpisodes.filter(e => e.importance >= 7);
  
  // Analyze patterns
  const successTags = extractTagPatterns(successes);
  const failureTags = extractTagPatterns(failures);
  
  // Generate insights
  const insights = [];
  
  // Success patterns
  if (successTags.length > 0) {
    insights.push({
      type: 'success_pattern',
      content: `Strong in: ${successTags.slice(0, 5).map(t => t.tag).join(', ')}`,
      confidence: 0.8
    });
  }
  
  // Failure patterns
  if (failureTags.length > 0) {
    insights.push({
      type: 'improvement_area',
      content: `Watch out for: ${failureTags.slice(0, 3).map(t => t.tag).join(', ')}`,
      confidence: 0.7
    });
  }
  
  // Success rate by type
  const typeStats = {};
  allEpisodes.forEach(e => {
    if (!typeStats[e.type]) typeStats[e.type] = { success: 0, total: 0 };
    typeStats[e.type].total++;
    if (e.outcome === 'success') typeStats[e.type].success++;
  });
  
  Object.entries(typeStats).forEach(([type, stats]) => {
    if (stats.total >= 3) {
      const rate = stats.success / stats.total;
      if (rate < 0.5) {
        insights.push({
          type: 'low_success_rate',
          content: `${type} tasks have ${Math.round(rate * 100)}% success rate - investigate`,
          confidence: 0.9
        });
      } else if (rate > 0.9) {
        insights.push({
          type: 'high_performer',
          content: `${type} tasks at ${Math.round(rate * 100)}% success - document procedures`,
          confidence: 0.9
        });
      }
    }
  });
  
  // Generate recommendations
  const recommendations = [];
  
  if (failures.length > successes.length * 0.3) {
    recommendations.push('High failure rate detected. Consider breaking tasks into smaller steps.');
  }
  
  if (highImportance.length < allEpisodes.length * 0.1) {
    recommendations.push('Few high-importance events logged. May be under-reporting significant work.');
  }
  
  const procedureList = procedures.list();
  const lowSuccessProcs = procedureList.filter(p => p.successRate !== null && p.successRate < 0.5);
  if (lowSuccessProcs.length > 0) {
    recommendations.push(`Review procedures: ${lowSuccessProcs.map(p => p.name).join(', ')}`);
  }
  
  const reflection = {
    period: { days, since, until: new Date().toISOString() },
    stats: {
      total: allEpisodes.length,
      successes: successes.length,
      failures: failures.length,
      highImportance: highImportance.length,
      successRate: allEpisodes.length > 0 ? successes.length / allEpisodes.length : null
    },
    typeBreakdown: typeStats,
    insights,
    recommendations,
    timestamp: new Date().toISOString()
  };
  
  // Save reflection
  const filename = `reflection-${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(path.join(REFLECTIONS_DIR, filename), JSON.stringify(reflection, null, 2));
  
  // Post key insights to blackboard
  insights.filter(i => i.confidence > 0.7).forEach(insight => {
    blackboard.post({
      type: 'discovery',
      topic: 'self-reflection',
      content: insight.content,
      metadata: { insightType: insight.type, confidence: insight.confidence }
    });
  });
  
  return reflection;
}

/**
 * Extract tag frequency patterns
 */
function extractTagPatterns(episodes) {
  const tagCounts = {};
  episodes.forEach(e => {
    (e.tags || []).forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  
  return Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Generate improvement actions based on reflection
 */
function generateActions(reflection) {
  const actions = [];
  
  reflection.insights.forEach(insight => {
    if (insight.type === 'improvement_area') {
      actions.push({
        action: 'investigate',
        target: insight.content,
        priority: 'high'
      });
    }
    if (insight.type === 'high_performer') {
      actions.push({
        action: 'document_procedure',
        target: insight.content,
        priority: 'medium'
      });
    }
  });
  
  reflection.recommendations.forEach(rec => {
    actions.push({
      action: 'implement_recommendation',
      target: rec,
      priority: 'medium'
    });
  });
  
  return actions;
}

/**
 * Get latest reflection
 */
function getLatest() {
  const files = fs.readdirSync(REFLECTIONS_DIR)
    .filter(f => f.endsWith('.json'))
    .sort()
    .reverse();
  
  if (files.length === 0) return null;
  return JSON.parse(fs.readFileSync(path.join(REFLECTIONS_DIR, files[0]), 'utf8'));
}

// CLI
const args = process.argv.slice(2);
const cmd = args[0];

if (cmd === 'run') {
  const days = parseInt(args[1]) || 7;
  const result = reflect(days);
  console.log(JSON.stringify(result, null, 2));
} else if (cmd === 'actions') {
  const latest = getLatest();
  if (latest) {
    console.log(JSON.stringify(generateActions(latest), null, 2));
  } else {
    console.log('No reflections yet. Run: reflection.js run');
  }
} else if (cmd === 'latest') {
  console.log(JSON.stringify(getLatest(), null, 2));
} else {
  console.log('Usage: reflection.js [run|actions|latest]');
  console.log('  run [days]  - Generate reflection for past N days');
  console.log('  actions     - Generate improvement actions from latest reflection');
  console.log('  latest      - Show latest reflection');
}

module.exports = { reflect, generateActions, getLatest };
