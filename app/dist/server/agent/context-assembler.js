import { db } from '../../db';
import { userIdentity, memoryShortTerm, userSettings } from '../../db/schema';
import { eq, desc, and, sql, like } from 'drizzle-orm';
import { DEFAULT_SOUL, DEFAULT_INSTRUCTIONS, DEFAULT_PROFILE, DEFAULT_TOOLS, DEFAULT_MEMORY } from './default-templates';
import { queryContextForText } from '../memory/graph-query';
// ── Constants ──────────────────────────────────────────────────────────────
const MAX_BUDGET_TOKENS = 4000;
const CHARS_PER_TOKEN = 4;
const MAX_BUDGET_CHARS = MAX_BUDGET_TOKENS * CHARS_PER_TOKEN;
const DEFAULTS = {
    soul: DEFAULT_SOUL,
    profile: DEFAULT_PROFILE,
    instructions: DEFAULT_INSTRUCTIONS,
    tools: DEFAULT_TOOLS,
    memory: DEFAULT_MEMORY,
};
// ── Classification ─────────────────────────────────────────────────────────
const CLASSIFICATION_KEYWORDS = {
    technical: ['code', 'bug', 'error', 'api', 'function', 'deploy', 'git', 'database', 'server', 'debug', 'typescript', 'javascript', 'python', 'docker', 'npm', 'build', 'compile', 'regex', 'sql', 'html', 'css', 'react', 'node', 'test', 'lint', 'script', 'bash', 'terminal', 'config', 'env', 'http', 'rest', 'graphql', 'schema'],
    personal: ['feel', 'feeling', 'emotion', 'love', 'hate', 'happy', 'sad', 'angry', 'family', 'friend', 'relationship', 'birthday', 'name', 'age', 'hobby', 'prefer', 'favorite', 'remember me', 'about me', 'my life', 'who am i', 'profile', 'timezone'],
    task: ['todo', 'task', 'remind', 'schedule', 'deadline', 'plan', 'organize', 'list', 'create task', 'track', 'done', 'finish', 'complete', 'priority', 'due', 'assign', 'calendar', 'meeting', 'event'],
    creative: ['write', 'story', 'poem', 'song', 'imagine', 'design', 'draw', 'paint', 'creative', 'fiction', 'character', 'plot', 'brainstorm', 'idea', 'invent', 'compose', 'narrative', 'art'],
    question: ['what', 'why', 'how', 'when', 'where', 'who', 'which', 'explain', 'tell me', 'describe', 'define', 'meaning', 'difference', 'compare'],
};
function classifyQuery(message) {
    const lower = message.toLowerCase();
    const scores = { technical: 0, personal: 0, task: 0, creative: 0, question: 0, general: 0 };
    for (const [cat, keywords] of Object.entries(CLASSIFICATION_KEYWORDS)) {
        for (const kw of keywords) {
            if (lower.includes(kw))
                scores[cat]++;
        }
    }
    let best = 'general';
    let bestScore = 0;
    for (const [cat, score] of Object.entries(scores)) {
        if (score > bestScore) {
            bestScore = score;
            best = cat;
        }
    }
    return best;
}
// ── Keyword extraction (shared with graph-query) ───────────────────────────
const STOP_WORDS = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'but', 'not', 'with', 'this', 'that', 'it', 'i', 'my', 'me', 'we', 'you', 'he', 'she', 'do', 'does', 'did', 'have', 'has', 'had', 'be', 'been', 'being', 'will', 'would', 'could', 'should', 'can', 'may', 'might', 'what', 'why', 'how', 'when', 'where', 'who', 'which']);
function extractKeywords(text) {
    return [...new Set(text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/)
            .filter(w => w.length > 2 && !STOP_WORDS.has(w)))].slice(0, 8);
}
// ── Selective identity logic ───────────────────────────────────────────────
function selectIdentityKeys(classification) {
    // soul + instructions always loaded
    const keys = ['soul', 'instructions'];
    switch (classification) {
        case 'personal':
            keys.push('profile', 'memory');
            break;
        case 'technical':
            keys.push('tools');
            break;
        case 'task':
            keys.push('tools', 'memory');
            break;
        case 'creative':
            // just soul + instructions is enough
            break;
        case 'question':
            keys.push('memory');
            break;
        case 'general':
        default:
            keys.push('profile', 'memory');
            break;
    }
    return keys;
}
// ── Relevant memory query ──────────────────────────────────────────────────
async function queryRelevantMemories(userId, keywords) {
    if (keywords.length === 0)
        return [];
    const now = new Date().toISOString();
    const results = [];
    const seenContent = new Set();
    for (const kw of keywords.slice(0, 5)) {
        try {
            const rows = await db
                .select({ content: memoryShortTerm.content, importance: memoryShortTerm.importance })
                .from(memoryShortTerm)
                .where(and(eq(memoryShortTerm.userId, userId), sql `(${memoryShortTerm.expiresAt} IS NULL OR ${memoryShortTerm.expiresAt} > ${now})`, like(memoryShortTerm.content, `%${kw}%`)))
                .orderBy(desc(memoryShortTerm.importance))
                .limit(3);
            for (const r of rows) {
                if (!seenContent.has(r.content)) {
                    seenContent.add(r.content);
                    results.push(r);
                }
            }
        }
        catch { /* table may not exist */ }
    }
    // Sort by importance, cap at 5
    return results.sort((a, b) => b.importance - a.importance).slice(0, 5);
}
// ── Token estimation & trimming ────────────────────────────────────────────
function estimateTokens(text) {
    return Math.ceil(text.length / CHARS_PER_TOKEN);
}
function trimTobudget(parts) {
    // Sort by priority (lower = more important = included first)
    const sorted = [...parts].sort((a, b) => a.priority - b.priority);
    const included = [];
    const kept = [];
    let usedChars = 0;
    for (const part of sorted) {
        if (usedChars + part.text.length <= MAX_BUDGET_CHARS) {
            kept.push(part.text);
            included.push(part.label);
            usedChars += part.text.length;
        }
        else {
            // Try to fit a trimmed version
            const remaining = MAX_BUDGET_CHARS - usedChars;
            if (remaining > 200) {
                kept.push(part.text.slice(0, remaining) + '\n...(trimmed)');
                included.push(part.label + '(trimmed)');
                usedChars = MAX_BUDGET_CHARS;
            }
            break;
        }
    }
    return { included, text: kept.join('\n\n') };
}
// ── Static sections ────────────────────────────────────────────────────────
const SKILLS_LIST = `## Available Skills
- web-research: Search and synthesize information from the internet
- task-manager: Create, organize, and track tasks with gamification
- code-helper: Write, debug, and explain code
- data-analysis: Analyze data, create charts, find patterns`;
const TOOLS_SECTION = `## Tools
You have access to these tools. Use them proactively:
- **execute_code**: Run code in a sandboxed environment
- **read_file / write_file / list_files**: Work with files
- **web_search**: Search the internet for current information
- **web_fetch**: Read content from a URL
- **spawn_agent**: Spawn a background sub-agent
- **create_task / search_tasks**: Manage tasks
- **search_knowledge**: Search the knowledge graph
- **render_canvas**: Show interactive content
- **remember / recall**: Save and retrieve memories
- **update_profile**: Update user info

Use tools to act, not just describe.`;
export async function assembleContext(userId, userMessage, withMetadata) {
    const message = userMessage || '';
    const classification = message ? classifyQuery(message) : 'general';
    const keywords = message ? extractKeywords(message) : [];
    // 1. Determine which identity files to load
    const neededKeys = selectIdentityKeys(classification);
    // 2. Load identity files (only needed ones)
    const identity = await db.select()
        .from(userIdentity)
        .where(eq(userIdentity.userId, userId));
    const files = {};
    for (const key of neededKeys) {
        const found = identity.find(i => i.fileKey === key);
        files[key] = found?.content || DEFAULTS[key];
    }
    // 3. Query relevant memories (not all)
    const relevantMemories = message
        ? await queryRelevantMemories(userId, keywords)
        : [];
    // 4. Knowledge graph entity lookup
    let graphEntities = { entities: [], facts: [] };
    if (message && keywords.length > 0) {
        try {
            const graphResult = await queryContextForText(userId, message);
            graphEntities = { entities: graphResult.entities.slice(0, 5), facts: graphResult.facts.slice(0, 10) };
        }
        catch { /* graph tables may not exist */ }
    }
    // 5. Load settings
    let settings = {};
    try {
        const rows = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
        settings = rows[0] || {};
    }
    catch { }
    const settingsJson = (settings.settings || {});
    // 6. Build parts with priorities (lower = higher priority)
    const parts = [];
    // Soul — always (P0)
    parts.push({ label: 'soul', text: files.soul || DEFAULTS.soul, priority: 0 });
    // Instructions — always (P1)
    parts.push({ label: 'instructions', text: files.instructions || DEFAULTS.instructions, priority: 1 });
    // Profile — when loaded (P2)
    if (files.profile) {
        parts.push({ label: 'profile', text: `## About Your Human\n${files.profile}`, priority: 2 });
    }
    // Tool notes — when loaded (P3)
    if (files.tools) {
        parts.push({ label: 'tools-notes', text: `## Tool Notes\n${files.tools}`, priority: 3 });
    }
    // Long-term memory — when loaded (P4)
    if (files.memory) {
        parts.push({ label: 'long-term-memory', text: `## Long-Term Memory\n${files.memory}`, priority: 4 });
    }
    // Relevant short-term memories (P5)
    if (relevantMemories.length > 0) {
        const memText = relevantMemories.map(m => `- ${m.content}`).join('\n');
        parts.push({ label: 'recent-context', text: `## Relevant Context\n${memText}`, priority: 5 });
    }
    // Graph entities (P6)
    if (graphEntities.entities.length > 0 || graphEntities.facts.length > 0) {
        const lines = [];
        for (const e of graphEntities.entities) {
            lines.push(`- **${e.name}** (${e.type})`);
        }
        for (const f of graphEntities.facts) {
            lines.push(`- ${f.key}: ${f.value}`);
        }
        parts.push({ label: 'knowledge-graph', text: `## Knowledge Graph\n${lines.join('\n')}`, priority: 6 });
    }
    // Time (P7)
    parts.push({ label: 'time', text: `## Current Time\n${new Date().toISOString()} (${settingsJson.timezone || 'UTC'})`, priority: 7 });
    // Skills + Tools description (P8)
    parts.push({ label: 'skills', text: SKILLS_LIST, priority: 8 });
    parts.push({ label: 'tools-desc', text: TOOLS_SECTION, priority: 9 });
    // Self-evolution (P10)
    if (settings.selfEvolutionEnabled) {
        parts.push({
            label: 'self-evolution',
            text: `## Self-Evolution (Enabled)\nYou may evolve your personality and operating instructions when you learn something significant.\nUse update_soul to modify your personality. Be thoughtful — small refinements only.`,
            priority: 10,
        });
    }
    // Onboarding (P0 — highest if needed)
    const needsOnboarding = !files.profile || files.profile.trim() === '';
    if (needsOnboarding && neededKeys.includes('profile')) {
        parts.push({
            label: 'onboarding',
            text: `## 🌟 ONBOARDING — New User!\nThis user hasn't set up their profile yet. Start a warm, natural conversation:\n1. Introduce yourself by name\n2. Ask their name and what to call them\n3. Ask what they want to use you for\n4. Ask their communication preference\n5. Ask their timezone\n\nAfter learning each thing, use update_profile to save it.`,
            priority: 0,
        });
    }
    // 7. Trim to budget
    const { included, text } = trimTobudget(parts);
    if (withMetadata) {
        return {
            prompt: text,
            metadata: {
                totalEstimatedTokens: estimateTokens(text),
                sectionsIncluded: included,
                memoriesIncluded: relevantMemories.length,
                graphEntitiesIncluded: graphEntities.entities.length,
                classification,
            },
        };
    }
    return text;
}
//# sourceMappingURL=context-assembler.js.map