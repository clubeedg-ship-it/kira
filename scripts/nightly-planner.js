#!/usr/bin/env node
/**
 * Nightly Planner - Runs at night to plan tomorrow's priorities
 * Called by cron job, outputs to Telegram
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const NOTION_KEY = fs.readFileSync(path.join(process.env.HOME, '.config/notion/api_key'), 'utf8').trim();
const MEMORY_DIR = path.join(process.env.HOME, 'clawd/memory');
const VDR_DIR = path.join(process.env.HOME, 'clawd/vdr');

async function notionRequest(endpoint, method = 'GET', body = null) {
  const args = [
    '-s',
    '-X', method,
    `https://api.notion.com/v1${endpoint}`,
    '-H', `Authorization: Bearer ${NOTION_KEY}`,
    '-H', 'Notion-Version: 2025-09-03',
    '-H', 'Content-Type: application/json'
  ];
  if (body) args.push('-d', JSON.stringify(body));
  const result = execSync(`curl ${args.map(a => `'${a}'`).join(' ')}`);
  return JSON.parse(result.toString());
}

async function getUpcomingDeadlines() {
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  
  const projects = await notionRequest('/data_sources/279a6c94-88ca-802a-b531-000b4470c5dd/query', 'POST', {
    filter: {
      and: [
        { property: 'Archive', checkbox: { equals: false } },
        { property: 'Status', status: { does_not_equal: 'Done' } }
      ]
    }
  });
  
  const deadlines = [];
  for (const project of projects.results || []) {
    const name = project.properties.Name?.title?.[0]?.plain_text || 'Untitled';
    const endDate = project.properties['End Date']?.date?.start;
    const priority = project.properties.Priority?.select?.name;
    const status = project.properties.Status?.status?.name;
    
    if (endDate) {
      const dueDate = new Date(endDate);
      const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      deadlines.push({ name, endDate, daysUntil, priority, status });
    } else {
      deadlines.push({ name, endDate: null, daysUntil: Infinity, priority, status });
    }
  }
  
  return deadlines.sort((a, b) => a.daysUntil - b.daysUntil);
}

async function generatePlan() {
  const deadlines = await getUpcomingDeadlines();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  
  let plan = `# 📅 Plan for ${tomorrowStr}\n\n`;
  
  // Urgent (due in 3 days or less)
  const urgent = deadlines.filter(d => d.daysUntil <= 3 && d.daysUntil >= 0);
  if (urgent.length > 0) {
    plan += `## 🔴 URGENT (Due in 3 days or less)\n`;
    for (const p of urgent) {
      plan += `- **${p.name}** — ${p.daysUntil === 0 ? 'TODAY!' : p.daysUntil === 1 ? 'Tomorrow!' : `${p.daysUntil} days`}\n`;
    }
    plan += '\n';
  }
  
  // This week
  const thisWeek = deadlines.filter(d => d.daysUntil > 3 && d.daysUntil <= 7);
  if (thisWeek.length > 0) {
    plan += `## 🟡 This Week\n`;
    for (const p of thisWeek) {
      plan += `- ${p.name} — ${p.daysUntil} days (${p.endDate})\n`;
    }
    plan += '\n';
  }
  
  // In progress without deadline
  const noDeadline = deadlines.filter(d => d.daysUntil === Infinity && d.status === 'In progress');
  if (noDeadline.length > 0) {
    plan += `## 🟢 In Progress (no deadline)\n`;
    for (const p of noDeadline.slice(0, 5)) {
      plan += `- ${p.name}\n`;
    }
    plan += '\n';
  }
  
  // Top 3 priorities for tomorrow
  plan += `## ⭐ Tomorrow's Top 3\n`;
  const top3 = urgent.length > 0 ? urgent.slice(0, 3) : deadlines.filter(d => d.status === 'In progress').slice(0, 3);
  for (let i = 0; i < Math.min(3, top3.length); i++) {
    plan += `${i + 1}. **${top3[i].name}**\n`;
  }
  
  // Weekly recurring
  const dayOfWeek = tomorrow.getDay();
  if (dayOfWeek === 1) { // Monday
    plan += `\n## 📞 Weekly Check-ins (Monday)\n`;
    plan += `- Abura Sales check with Kwame\n`;
  }
  
  return plan;
}

async function main() {
  try {
    const plan = await generatePlan();
    
    // Save to memory
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const filename = `plan-${tomorrow.toISOString().split('T')[0]}.md`;
    fs.writeFileSync(path.join(MEMORY_DIR, filename), plan);
    
    // Output for Telegram (will be sent by cron)
    console.log(plan);
  } catch (error) {
    console.error('Planner error:', error.message);
    process.exit(1);
  }
}

main();
