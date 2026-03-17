import { and, asc, desc, eq, sql, like, SQL } from 'drizzle-orm';
import { Router } from 'express';

import { db } from '../../db/index';
import {
  conversations,
  messages,
  userSettings,
  users,
  tasks,
  projects,
  documents,
  entities,
  areas,
  objectives,
  facts,
  canvasStates,
  agentRuns,
  userIdentity,
  memoryShortTerm,
} from '../../db/schema';
import { assembleContext } from '../agent/context-assembler';
import * as crypto from 'crypto';
import { postProcessMessage } from '../chat-postprocess';

// In-memory fallback for agent runs (when DB insert fails due to schema issues)
const agentRunCache = new Map<string, { status: string; output?: string; error?: string; startedAt: string; finishedAt?: string }>();
import {
  executeCode,
  listWorkspaceFiles,
  readWorkspaceFile,
  writeWorkspaceFile,
} from '../sandbox';

// ── Optional integrations (fail gracefully if modules missing) ──
let enhancePrompt: any = null;
let scorePrompt: any = null;
let buildMemoryContext: any = null;
let remember: any = null;

try { const pe = require('../prompt-engine'); enhancePrompt = pe.enhancePrompt; scorePrompt = pe.scorePrompt; } catch {}
try { const mc = require('../memory/context-builder'); buildMemoryContext = mc.buildMemoryContext; } catch {}
try { const st = require('../memory/short-term'); remember = st.remember; } catch {}

let extractFacts: any = null;
let storeInWorking: any = null;
let promoteToShortTerm: any = null;
try {
  const ext = require('../memory/extractor'); extractFacts = ext.extractFacts;
  const ss = require('../memory/session-store'); storeInWorking = ss.storeInWorking; promoteToShortTerm = ss.promoteToShortTerm;
} catch {}

import * as fs from 'fs';
import * as path from 'path';

import {
  asyncHandler,
  asRecord,
  getTrimmedString,
  isUuid,
  notFound,
  success,
  validationError,
} from './utils';
import { recordContextMetrics } from '../middleware/context-monitor';

/* ── OpenClaw Bridge Configuration ────────────────── */
const OPENCLAW_BRIDGE_URL = process.env.OPENCLAW_BRIDGE_URL || 'http://host.docker.internal:3855';
const OPENCLAW_BRIDGE_TOKEN = process.env.OPENCLAW_BRIDGE_TOKEN || 'kira-bridge-2024';
const USE_OPENCLAW = process.env.USE_OPENCLAW === 'true';
// Comma-separated list of usernames allowed to use OpenClaw-routed chat.
// Empty or unset = all users (backwards-compatible when USE_OPENCLAW is on).
const OPENCLAW_ALLOWED_USERS = (process.env.OPENCLAW_ALLOWED_USERS || '')
  .split(',')
  .map(u => u.trim().toLowerCase())
  .filter(Boolean);

/* ── Vision-capable models ────────────────────────── */
const VISION_MODELS = new Set([
  'anthropic/claude-opus-4-6',
  'anthropic/claude-sonnet-4-5',
  'anthropic/claude-sonnet-4',
  'anthropic/claude-haiku-3.5',
  'openai/gpt-4.1',
  'openai/gpt-4.1-mini',
  'openai/o3',
  'openai/o4-mini',
  'google/gemini-2.5-pro',
  'google/gemini-2.5-flash',
  'google/gemini-2.0-flash',
  'google/gemini-2.0-flash-lite',
  'meta-llama/llama-4-maverick',
  'meta-llama/llama-4-scout',
]);

function imageToBase64DataUrl(filePath: string, mimeType: string): string | null {
  try {
    const buffer = fs.readFileSync(filePath);
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

const chatRouter = Router();

/* ── System prompt ────────────────────────────────── */

/* ── Build dynamic system prompt with persistent context ── */

async function buildSystemPrompt(userId: string, conversationId?: string, currentInput?: string): Promise<string> {
  // Fetch user's active tasks
  const activeTasks = await db
    .select({ id: tasks.id, title: tasks.title, status: tasks.status, priority: tasks.priority })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), sql`${tasks.status} != 'done'`))
    .orderBy(desc(tasks.priority))
    .limit(15);

  // Fetch user's projects
  const activeProjects = await db
    .select({ id: projects.id, title: projects.title, status: projects.status })
    .from(projects)
    .where(and(eq(projects.userId, userId), eq(projects.status, 'active')))
    .limit(10);

  // Fetch recent facts from knowledge graph
  let recentFacts: Array<{ key: string; value: string }> = [];
  try {
    recentFacts = await db
      .select({ key: facts.key, value: facts.value })
      .from(facts)
      .where(eq(facts.userId, userId))
      .orderBy(desc(facts.updatedAt))
      .limit(20);
  } catch {}

  // Fetch workspace files
  const files = listWorkspaceFiles(userId);

  const taskList = activeTasks.length
    ? activeTasks.map(t => `  - [${t.status}] ${t.title} (priority: ${t.priority})`).join('\n')
    : '  (no active tasks)';

  const projectList = activeProjects.length
    ? activeProjects.map(p => `  - ${p.title} (${p.status})`).join('\n')
    : '  (no projects)';

  const factList = recentFacts.length
    ? recentFacts.map(f => `  - ${f.key}: ${f.value}`).join('\n')
    : '';

  const fileList = files.length
    ? `\nWorkspace files: ${files.join(', ')}`
    : '';

  const basePrompt = `You are Kira — an AI executive partner. You help the user identify goals, break them into actionable tasks, manage projects, and get real work done.

## Your Capabilities
You can EXECUTE CODE (bash, Python, JavaScript) in a sandboxed environment. Use this to:
- Analyze data, generate reports, build tools
- Process files the user uploads or creates
- Run calculations, API calls (within sandbox), data transformations
- Build scripts and utilities on the fly

You can also manage the user's workspace: create tasks, documents, search knowledge, read/write files.

You can SEARCH THE WEB for current information. Use web_search to find results, then web_fetch to read specific pages in detail.
- Use web_search for: current events, documentation, tutorials, product info, fact-checking
- Use web_fetch to: read a specific URL the user shares, or dive deeper into a search result

You can SPAWN SUB-AGENTS for parallel work. Use spawn_agent for:
- Research tasks that take time
- Long analysis that shouldn't block the conversation
- Parallel work (spawn multiple agents for different tasks)
After spawning, you can check_agent to see if they're done.

## Rules
- When the user asks you to DO something, USE TOOLS. Don't describe — execute.
- For code execution: write clean code, handle errors, verify output.
- Be concise and direct. No filler.
- When you create something (task, doc, file), confirm with the result.
- If a task requires multiple steps, execute them in sequence. Don't stop halfway.

## User's Current State
Active tasks:
${taskList}

Active projects:
${projectList}
${factList ? `\nKnown facts about user:\n${factList}` : ''}${fileList}`;

  // Append memory context if available
  if (buildMemoryContext && conversationId && currentInput) {
    try {
      const memory = await buildMemoryContext(userId, conversationId, currentInput);
      let memorySection = '';
      if (memory.workingMemory) memorySection += `\n## Current Context\n${memory.workingMemory}`;
      if (memory.relevantKnowledge) memorySection += `\n## Relevant Knowledge\n${memory.relevantKnowledge}`;
      if (memory.shortTermMemory) memorySection += `\n## Recent Memory\n${memory.shortTermMemory}`;
      if (memory.proceduralHints) memorySection += `\n## Your Preferences\n${memory.proceduralHints}`;
      return basePrompt + memorySection;
    } catch (e) {
      console.error('Memory context build failed:', e);
    }
  }

  return basePrompt;
}

/* ── Tool definitions (OpenAI format for OpenRouter) ── */

const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'execute_code',
      description:
        'Execute code in a sandboxed environment. Use for data analysis, calculations, building tools, processing files, or any computational task. The sandbox has node, python3, and bash. Files persist in /workspace.',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'The code to execute' },
          language: {
            type: 'string',
            description: 'Programming language',
            enum: ['bash', 'python', 'javascript'],
          },
        },
        required: ['code', 'language'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'read_file',
      description: 'Read a file from the user\'s workspace.',
      parameters: {
        type: 'object',
        properties: {
          filename: { type: 'string', description: 'File name to read' },
        },
        required: ['filename'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'write_file',
      description: 'Write or create a file in the user\'s workspace.',
      parameters: {
        type: 'object',
        properties: {
          filename: { type: 'string', description: 'File name to write' },
          content: { type: 'string', description: 'File content' },
        },
        required: ['filename', 'content'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_files',
      description: 'List files in the user\'s workspace.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_task',
      description:
        'Create a new task in the user\'s project board. Use when the user mentions something they need to do.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Task title' },
          description: { type: 'string', description: 'Task description (optional)' },
          priority: {
            type: 'number',
            description: '0=low, 1=medium, 2=high, 3=critical',
            enum: [0, 1, 2, 3],
          },
          projectId: {
            type: 'string',
            description: 'Project UUID to add task to (optional)',
          },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_tasks',
      description: 'Search the user\'s tasks by keyword or status.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search keyword' },
          status: {
            type: 'string',
            description: 'Filter by status',
            enum: ['todo', 'in_progress', 'done', 'blocked'],
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_document',
      description: 'Create a document in the workspace.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Document title' },
          content: { type: 'string', description: 'Document content (markdown)' },
        },
        required: ['title', 'content'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_knowledge',
      description:
        'Search the knowledge graph for entities (people, companies, projects, concepts).',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          type: {
            type: 'string',
            description: 'Entity type filter',
            enum: ['person', 'company', 'project', 'concept', 'decision', 'event'],
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_projects',
      description: 'List the user\'s projects to find where to add tasks.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'render_canvas',
      description: 'Render interactive content in the Live Canvas. Can show forms for user input, setup wizards, data visualizations, or full web apps from the sandbox.',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['form', 'wizard', 'visualization', 'html', 'app'], description: 'Type of canvas content' },
          title: { type: 'string', description: 'Title shown in the canvas tab' },
          content: { type: 'object', description: 'Content definition — form fields, HTML string, or sandbox config' },
        },
        required: ['type', 'title', 'content'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_canvas_response',
      description: 'Get the user response from a previously rendered form or wizard canvas.',
      parameters: {
        type: 'object',
        properties: {
          canvas_id: { type: 'string', description: 'The canvas ID to check' },
        },
        required: ['canvas_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'spawn_agent',
      description: 'Spawn a background sub-agent to work on a task independently. The sub-agent runs asynchronously and stores its result. Use for: research tasks, long-running analysis, parallel work, anything that takes time.',
      parameters: {
        type: 'object',
        properties: {
          task: { type: 'string', description: 'Detailed description of what the sub-agent should do' },
          name: { type: 'string', description: 'Short name for this agent (e.g., "Research Agent", "Code Reviewer")' },
          model: { type: 'string', description: 'Optional model override. Default: same as chat model' },
        },
        required: ['task', 'name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'check_agent',
      description: 'Check the status and result of a previously spawned sub-agent.',
      parameters: {
        type: 'object',
        properties: {
          run_id: { type: 'string', description: 'The run ID returned by spawn_agent' },
        },
        required: ['run_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'web_search',
      description: 'Search the internet for current information. Use when the user asks about recent events, facts you\'re unsure about, product comparisons, documentation, tutorials, or anything that benefits from up-to-date web results.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          count: { type: 'number', description: 'Number of results (1-5, default 3)' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'web_fetch',
      description: 'Fetch and read the content of a specific URL. Returns the page as readable text/markdown. Use after web_search to read a specific result in detail, or when the user shares a URL.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to fetch' },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'remember',
      description: 'Save an important fact to long-term memory. Use when you learn something worth remembering about the user, their preferences, decisions, or important context.',
      parameters: {
        type: 'object',
        properties: {
          fact: { type: 'string', description: 'The fact to remember' },
          category: { type: 'string', description: 'Category: fact, preference, decision, context', enum: ['fact', 'preference', 'decision', 'context'] },
        },
        required: ['fact'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'recall',
      description: 'Search your memories for relevant context. Use before answering questions about past conversations or user preferences.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query to find relevant memories' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_profile',
      description: 'Update what you know about the user. Use during onboarding or when learning new info about the user (name, preferences, timezone, etc).',
      parameters: {
        type: 'object',
        properties: {
          field: { type: 'string', description: 'Profile field name (e.g., Name, Timezone, Preferences, Goals)' },
          value: { type: 'string', description: 'The value to set for this field' },
        },
        required: ['field', 'value'],
      },
    },
  },
];

/* ── Tool execution ───────────────────────────────── */

async function getApiKey(userId: string): Promise<string | null> {
  try {
    const settings = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
    const s = (settings[0]?.settings ?? {}) as Record<string, string>;
    return s.openRouterKey || process.env.OPENROUTER_API_KEY || null;
  } catch {
    return process.env.OPENROUTER_API_KEY || null;
  }
}

async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  userId: string,
): Promise<string> {
  switch (toolName) {
    case 'execute_code': {
      const code = (args.code as string) || '';
      const lang = (args.language as 'bash' | 'python' | 'javascript') || 'bash';
      const result = await executeCode(userId, code, lang);
      return JSON.stringify({
        exitCode: result.exitCode,
        stdout: result.stdout || '(no output)',
        stderr: result.stderr || '',
        timedOut: result.timedOut,
        durationMs: result.durationMs,
      });
    }

    case 'read_file': {
      const filename = (args.filename as string) || '';
      const content = readWorkspaceFile(userId, filename);
      if (content === null) return JSON.stringify({ error: `File not found: ${filename}` });
      return JSON.stringify({ filename, content: content.slice(0, 10000), size: content.length });
    }

    case 'write_file': {
      const filename = (args.filename as string) || '';
      const content = (args.content as string) || '';
      const ok = writeWorkspaceFile(userId, filename, content);
      return JSON.stringify({ success: ok, filename });
    }

    case 'list_files': {
      const files = listWorkspaceFiles(userId);
      return JSON.stringify({ files, count: files.length });
    }

    case 'create_task': {
      const [task] = await db
        .insert(tasks)
        .values({
          userId,
          projectId: (args.projectId as string) || null,
          title: (args.title as string) || 'Untitled task',
          description: (args.description as string) || null,
          status: 'todo',
          priority: (args.priority as number) ?? 1,
          executorType: 'user',
          requiresInput: 'none',
          energy: 'medium',
          sortOrder: 0,
        })
        .returning();
      return JSON.stringify({ success: true, task: { id: task.id, title: task.title, status: task.status } });
    }

    case 'search_tasks': {
      const query = (args.query as string) || '';
      const status = args.status as string | undefined;
      
      let rows;
      if (status) {
        rows = await db
          .select({ id: tasks.id, title: tasks.title, status: tasks.status, priority: tasks.priority })
          .from(tasks)
          .where(and(eq(tasks.userId, userId), eq(tasks.status, status)))
          .limit(20);
      } else {
        rows = await db
          .select({ id: tasks.id, title: tasks.title, status: tasks.status, priority: tasks.priority })
          .from(tasks)
          .where(eq(tasks.userId, userId))
          .limit(20);
      }
      
      if (query) {
        const q = query.toLowerCase();
        rows = rows.filter((r) => r.title.toLowerCase().includes(q));
      }
      return JSON.stringify({ tasks: rows, count: rows.length });
    }

    case 'create_document': {
      const [doc] = await db
        .insert(documents)
        .values({
          userId,
          title: (args.title as string) || 'Untitled',
          content: (args.content as string) || '',
        })
        .returning();
      return JSON.stringify({ success: true, document: { id: doc.id, title: doc.title } });
    }

    case 'search_knowledge': {
      const query = (args.query as string) || '';
      const type = args.type as string | undefined;
      const q = query.toLowerCase();

      let rows;
      if (type) {
        rows = await db
          .select({ id: entities.id, name: entities.name, type: entities.type })
          .from(entities)
          .where(and(eq(entities.userId, userId), eq(entities.type, type)))
          .limit(20);
      } else {
        rows = await db
          .select({ id: entities.id, name: entities.name, type: entities.type })
          .from(entities)
          .where(eq(entities.userId, userId))
          .limit(20);
      }

      if (q) {
        rows = rows.filter((r) => r.name.toLowerCase().includes(q));
      }
      return JSON.stringify({ entities: rows, count: rows.length });
    }

    case 'list_projects': {
      const rows = await db
        .select({ id: projects.id, title: projects.title, status: projects.status })
        .from(projects)
        .where(eq(projects.userId, userId))
        .limit(20);
      return JSON.stringify({ projects: rows });
    }

    case 'render_canvas': {
      const type = (args.type as string) || 'html';
      const title = (args.title as string) || 'Canvas';
      const content = args.content || {};
      const [canvas] = await db
        .insert(canvasStates)
        .values({ userId, type, title, content, status: 'active' })
        .returning();
      return JSON.stringify({ success: true, canvas_id: canvas.id, title: canvas.title, url: `/canvas/${canvas.id}` });
    }

    case 'get_canvas_response': {
      const canvasId = args.canvas_id as string;
      if (!canvasId) return JSON.stringify({ error: 'canvas_id required' });
      const [canvas] = await db
        .select()
        .from(canvasStates)
        .where(and(eq(canvasStates.id, canvasId), eq(canvasStates.userId, userId)));
      if (!canvas) return JSON.stringify({ error: 'Canvas not found' });
      return JSON.stringify({ canvas_id: canvas.id, status: canvas.status, response: canvas.response });
    }

    case 'spawn_agent': {
      const task = (args.task as string) || '';
      const name = (args.name as string) || 'Sub-Agent';
      const model = (args.model as string) || null;
      const runId = crypto.randomUUID();

      // Persist run record (DB + in-memory fallback)
      agentRunCache.set(runId, { status: 'pending', startedAt: new Date().toISOString() });
      try {
        await db.insert(agentRuns).values({
          id: runId,
          agentId: null,
          userId,
          status: 'pending',
          input: task,
          startedAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('[spawn_agent] DB insert failed, using in-memory fallback:', (e as Error).message);
      }

      // Fire and forget async execution
      (async () => {
        try {
          const apiKey = await getApiKey(userId);
          if (!apiKey) return;

          const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: model || process.env.CHAT_MODEL || 'minimax/minimax-m2.5',
              messages: [
                { role: 'system', content: `You are ${name}. Complete the following task thoroughly and return your findings.` },
                { role: 'user', content: task },
              ],
            }),
          });

          const result = await resp.json() as any;
          const output = result.choices?.[0]?.message?.content || 'No output';
          const finishedAt = new Date().toISOString();

          agentRunCache.set(runId, { status: 'done', output, startedAt: agentRunCache.get(runId)?.startedAt || finishedAt, finishedAt });
          try {
            await db.update(agentRuns)
              .set({ status: 'done', output, finishedAt })
              .where(eq(agentRuns.id, runId));
          } catch {}
        } catch (err) {
          const finishedAt = new Date().toISOString();
          agentRunCache.set(runId, { status: 'error', error: String(err), startedAt: agentRunCache.get(runId)?.startedAt || finishedAt, finishedAt });
          try {
            await db.update(agentRuns)
              .set({ status: 'error', error: String(err), finishedAt })
              .where(eq(agentRuns.id, runId));
          } catch {}
        }
      })();

      return JSON.stringify({
        success: true,
        runId,
        name,
        message: `Sub-agent "${name}" spawned. Running in background.`,
      });
    }

    case 'check_agent': {
      const runId = (args.run_id as string) || '';
      try {
        const runs = await db.select().from(agentRuns).where(eq(agentRuns.id, runId)).limit(1);
        if (!runs.length) {
          // Fallback to in-memory cache
          const cached = agentRunCache.get(runId);
          if (cached) {
            return JSON.stringify({
              status: cached.status,
              output: cached.output?.slice(0, 5000) || null,
              error: cached.error || null,
              startedAt: cached.startedAt,
              finishedAt: cached.finishedAt || null,
            });
          }
          return JSON.stringify({ error: 'Agent run not found' });
        }
        const run = runs[0];
        return JSON.stringify({
          status: run.status,
          output: run.output?.slice(0, 5000) || null,
          error: run.error || null,
          startedAt: run.startedAt,
          finishedAt: run.finishedAt,
        });
      } catch (e) {
        return JSON.stringify({ error: 'Could not check agent status' });
      }
    }

    case 'web_search': {
      const query = (args.query as string) || '';
      const count = Math.min(Math.max((args.count as number) || 3, 1), 5);

      try {
        // Use Brave Search API if key available
        const braveKey = process.env.BRAVE_SEARCH_API_KEY;

        if (braveKey) {
          const resp = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`, {
            headers: { 'Accept': 'application/json', 'Accept-Encoding': 'gzip', 'X-Subscription-Token': braveKey },
          });
          const data = await resp.json();
          const results = (data.web?.results || []).slice(0, count).map((r: any) => ({
            title: r.title,
            url: r.url,
            description: r.description,
          }));
          return JSON.stringify({ results, query });
        }

        // Fallback: DuckDuckGo instant answer API (free, no key)
        const resp = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`);
        const data = await resp.json();
        const results: any[] = [];
        if (data.AbstractText) results.push({ title: data.AbstractSource, url: data.AbstractURL, description: data.AbstractText });
        for (const r of (data.RelatedTopics || []).slice(0, count)) {
          if (r.Text) results.push({ title: r.Text.slice(0, 80), url: r.FirstURL, description: r.Text });
        }

        if (results.length === 0) {
          return JSON.stringify({ results: [], query, note: 'No results found. Try a different query or use web_fetch with a direct URL.' });
        }

        return JSON.stringify({ results, query });
      } catch (e) {
        return JSON.stringify({ error: `Search failed: ${e}`, query });
      }
    }

    case 'web_fetch': {
      const url = (args.url as string) || '';
      if (!url.startsWith('http')) return JSON.stringify({ error: 'URL must start with http:// or https://' });

      try {
        // Use Jina Reader for clean markdown extraction
        const resp = await fetch(`https://r.jina.ai/${url}`, {
          headers: { 'Accept': 'text/plain' },
          signal: AbortSignal.timeout(15000),
        });
        const content = (await resp.text()).slice(0, 8000);
        return JSON.stringify({ url, content, length: content.length });
      } catch (e) {
        return JSON.stringify({ error: `Fetch failed: ${e}`, url });
      }
    }

    case 'remember': {
      const fact = args.fact as string;
      const category = (args.category as string) || 'fact';

      const existing = await db.select().from(userIdentity)
        .where(and(eq(userIdentity.userId, userId), eq(userIdentity.fileKey, 'memory')))
        .limit(1);

      const timestamp = new Date().toISOString().split('T')[0];
      const newEntry = `- [${timestamp}] [${category}] ${fact}`;
      const currentContent = existing[0]?.content || '# Long-Term Memory\n';
      const updated = currentContent + '\n' + newEntry;

      await db.insert(userIdentity).values({
        userId, fileKey: 'memory', content: updated, updatedBy: 'agent'
      }).onConflictDoUpdate({
        target: [userIdentity.userId, userIdentity.fileKey],
        set: { content: updated, updatedAt: new Date().toISOString(), updatedBy: 'agent', version: sql`${userIdentity.version} + 1` }
      });

      try {
        await db.insert(memoryShortTerm).values({
          userId, type: category, content: `[${category}] ${fact}`, importance: 0.7
        });
      } catch {}

      return JSON.stringify({ success: true, message: `Remembered: ${fact}` });
    }

    case 'recall': {
      const query = (args.query as string).toLowerCase();

      const memFile = await db.select().from(userIdentity)
        .where(and(eq(userIdentity.userId, userId), eq(userIdentity.fileKey, 'memory')))
        .limit(1);

      const content = memFile[0]?.content || '';
      const lines = content.split('\n').filter(l => l.trim());
      const matches = lines.filter(l => l.toLowerCase().includes(query));

      let shortTerm: any[] = [];
      try {
        shortTerm = await db.select().from(memoryShortTerm)
          .where(eq(memoryShortTerm.userId, userId))
          .orderBy(desc(memoryShortTerm.createdAt))
          .limit(20);
      } catch {}
      const stMatches = shortTerm.filter(m => m.content.toLowerCase().includes(query));

      return JSON.stringify({
        longTermMatches: matches.slice(0, 10),
        shortTermMatches: stMatches.map(m => m.content).slice(0, 10),
        query
      });
    }

    case 'update_profile': {
      const field = args.field as string;
      const value = args.value as string;

      const existing = await db.select().from(userIdentity)
        .where(and(eq(userIdentity.userId, userId), eq(userIdentity.fileKey, 'profile')))
        .limit(1);

      let content = existing[0]?.content || '# About You\n';

      const sectionRegex = new RegExp(`## ${field}[\\s\\S]*?(?=\\n## |$)`, 'i');
      if (sectionRegex.test(content)) {
        content = content.replace(sectionRegex, `## ${field}\n${value}`);
      } else {
        content += `\n\n## ${field}\n${value}`;
      }

      await db.insert(userIdentity).values({
        userId, fileKey: 'profile', content, updatedBy: 'agent'
      }).onConflictDoUpdate({
        target: [userIdentity.userId, userIdentity.fileKey],
        set: { content, updatedAt: new Date().toISOString(), updatedBy: 'agent', version: sql`${userIdentity.version} + 1` }
      });

      return JSON.stringify({ success: true, message: `Updated profile: ${field}` });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

/* ── Routes ───────────────────────────────────────── */

// List conversations
chatRouter.get(
  '/conversations',
  asyncHandler(async (req, res) => {
    const rows = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, req.userId))
      .orderBy(desc(conversations.updatedAt));
    success(res, rows);
  }),
);

// Create conversation
chatRouter.post(
  '/conversations',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const title = getTrimmedString(body.title) ?? 'New conversation';
    const model =
      getTrimmedString(body.model) ?? (process.env.CHAT_MODEL || 'minimax/minimax-m2.5');

    const [created] = await db
      .insert(conversations)
      .values({ userId: req.userId, title, model })
      .returning();
    success(res, created, 201);
  }),
);

// Get messages
chatRouter.get(
  '/conversations/:id/messages',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    if (!isUuid(id)) { validationError(res, 'Invalid conversation ID'); return; }

    const [conv] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, req.userId)));
    if (!conv) { notFound(res, 'Conversation not found'); return; }

    const rows = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.createdAt));
    success(res, rows);
  }),
);

// ── OpenClaw history endpoint ──
chatRouter.get(
  '/openclaw-history',
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    try {
      const resp = await fetch(`${OPENCLAW_BRIDGE_URL}/api/history?limit=${limit}`, {
        headers: { Authorization: `Bearer ${OPENCLAW_BRIDGE_TOKEN}` },
      });
      if (!resp.ok) throw new Error(`Bridge returned ${resp.status}`);
      const data = await resp.json() as any;
      // Strip [WebUI] prefix from displayed messages
      if (data.data) {
        for (const msg of data.data) {
          if (typeof msg.content === 'string') {
            msg.content = msg.content.replace(/^\[WebUI\]\s*/i, '');
          }
        }
      }
      success(res, data.data || []);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }),
);

// ── Send message via OpenClaw Bridge (SSE proxy) ──
async function sendToOpenClaw(content: string, res: any, conversationId: string, userId: string, userMsg: any) {
  console.log(`[openclaw] sendToOpenClaw called — conv=${conversationId} contentLen=${content.length}`);

  // SSE setup
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Safe write — client may disconnect mid-stream; never let that kill the handler
  let clientGone = false;
  const safeSend = (data: string) => {
    if (clientGone) return;
    try { res.write(data); } catch { clientGone = true; }
  };
  res.on('close', () => { clientGone = true; console.log(`[openclaw] client disconnected — conv=${conversationId}`); });

  safeSend(`data: ${JSON.stringify({ type: 'user_message', message: userMsg })}\n\n`);

  // Keep-alive heartbeat — prevents proxy/client from timing out during long bridge waits
  const heartbeat = setInterval(() => {
    safeSend(`data: ${JSON.stringify({ type: 'keepalive' })}\n\n`);
  }, 5_000);

  let fullResponse = '';

  try { // outer try — ensures heartbeat cleanup + res.end()
  try {
    console.log(`[openclaw] fetching bridge at ${OPENCLAW_BRIDGE_URL}/api/chat`);
    const bridgeResp = await fetch(`${OPENCLAW_BRIDGE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENCLAW_BRIDGE_TOKEN}`,
      },
      body: JSON.stringify({ message: content, userId }),
      signal: AbortSignal.timeout(180_000), // 3-minute timeout
    });

    console.log(`[openclaw] bridge responded — status=${bridgeResp.status} hasBody=${!!bridgeResp.body}`);

    if (!bridgeResp.ok || !bridgeResp.body) {
      const errText = await bridgeResp.text();
      console.log(`[openclaw] bridge error — ${errText}`);
      safeSend(`data: ${JSON.stringify({ type: 'error', error: errText })}\n\n`);
      clearInterval(heartbeat);
      safeSend('data: [DONE]\n\n');
      try { res.end(); } catch {}
      return;
    }

    const reader = bridgeResp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);

        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'delta') {
            fullResponse += parsed.content;
            safeSend(`data: ${JSON.stringify({ type: 'delta', content: parsed.content })}\n\n`);
          } else if (parsed.type === 'text') {
            // Structured text block from JSONL
            fullResponse += parsed.content;
            safeSend(`data: ${JSON.stringify({ type: 'delta', content: parsed.content })}\n\n`);
          } else if (parsed.type === 'tool_use') {
            // Tool call block — forward as tool_call event (matches frontend StreamEvent)
            const toolBlock = `\n\n<tool_use name="${parsed.name}">\n${JSON.stringify(parsed.arguments, null, 2)}\n</tool_use>\n\n`;
            fullResponse += toolBlock;
            safeSend(`data: ${JSON.stringify({ type: 'tool_call', name: parsed.name, callId: parsed.id, args: parsed.arguments })}\n\n`);
          } else if (parsed.type === 'tool_result') {
            // Tool result block — forward as tool_result event (matches frontend StreamEvent)
            const resultBlock = `\n<tool_result name="${parsed.name}">\n${parsed.content}\n</tool_result>\n\n`;
            fullResponse += resultBlock;
            safeSend(`data: ${JSON.stringify({ type: 'tool_result', callId: parsed.id, result: parsed.content })}\n\n`);
          } else if (parsed.type === 'assistant_message') {
            fullResponse = parsed.content || fullResponse;
          } else if (parsed.type === 'error') {
            console.log(`[openclaw] bridge stream error — ${parsed.error}`);
            safeSend(`data: ${JSON.stringify({ type: 'error', error: parsed.error })}\n\n`);
          }
        } catch {}
      }
    }

    console.log(`[openclaw] stream finished — fullResponseLen=${fullResponse.length} clientGone=${clientGone}`);
  } catch (err: any) {
    console.error(`[openclaw] fetch/stream error:`, (err as Error).message);
    safeSend(`data: ${JSON.stringify({ type: 'error', error: (err as Error).message })}\n\n`);
  }

  // Strip [WebUI] prefix if it leaked into response
  fullResponse = fullResponse.replace(/^\[WebUI\]\s*/i, '');

  // ALWAYS persist to DB — even if client disconnected mid-stream
  if (fullResponse) {
    try {
      const [assistantMsg] = await db
        .insert(messages)
        .values({
          conversationId,
          userId,
          role: 'assistant',
          content: fullResponse,
          metadata: { model: 'openclaw/kira' },
        })
        .returning();

      await db
        .update(conversations)
        .set({ updatedAt: sql`now()` })
        .where(eq(conversations.id, conversationId));

      safeSend(`data: ${JSON.stringify({ type: 'assistant_message', message: assistantMsg })}\n\n`);

      console.log(`[openclaw] saved assistant msg — conv=${conversationId} len=${fullResponse.length}`);

      // Fire-and-forget post-processing (auto-title, entity extraction, etc.)
      postProcessMessage(userId, conversationId, fullResponse, content).catch(console.error);

      // Record context metrics for OpenClaw path
      recordContextMetrics({
        userId,
        conversationId,
        messageId: assistantMsg.id,
        systemPrompt: '',
        historyMessages: [{ role: 'user', content }],
        response: fullResponse,
      }).catch(console.error);

      // Fire-and-forget memory extraction (<5ms sync, DB writes async)
      if (extractFacts && storeInWorking && promoteToShortTerm) {
        try {
          const facts = extractFacts(content, fullResponse);
          if (facts.length > 0) {
            storeInWorking(conversationId, facts);
            promoteToShortTerm(userId, conversationId, facts).catch(console.error);
          }
        } catch (e) { console.error('[memory-wire] extraction error:', e); }
      }
    } catch (e) {
      console.error('[openclaw] failed to save message:', e);
    }
  } else {
    console.log(`[openclaw] empty response — nothing to save — conv=${conversationId}`);
  }

  safeSend('data: [DONE]\n\n');
  } finally { // outer finally — always clean up
    clearInterval(heartbeat);
    try { if (!res.writableEnded) res.end(); } catch {}
  }
}

// Send message + AI response with tool use loop
chatRouter.post(
  '/conversations/:id/messages',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    if (!isUuid(id)) { validationError(res, 'Invalid conversation ID'); return; }

    const body = asRecord(req.body);
    const content = getTrimmedString(body.content);
    if (!content) { validationError(res, 'content is required'); return; }

    const attachments = Array.isArray(body.attachments) ? body.attachments : [];

    const [conv] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, req.userId)));
    if (!conv) { notFound(res, 'Conversation not found'); return; }

    // Store user message with attachments in metadata
    const metadata = attachments.length > 0 ? { attachments } : undefined;
    const [userMsg] = await db
      .insert(messages)
      .values({ conversationId: id, userId: req.userId, role: 'user', content, metadata })
      .returning();

    // ── OpenClaw routing (Kira admin only — Otto's account) ──
    if (USE_OPENCLAW && req.userId === 'd5a11c42-b9fb-498b-bee3-152ad5d82d10') {
      return sendToOpenClaw(content, res, id, req.userId, userMsg);
    }
    // All other users → OpenRouter path below

    // Read user settings early (needed for model-aware history building)
    const [userSetting] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, req.userId));

    const settings = (userSetting?.settings ?? {}) as Record<string, string>;
    const model =
      settings.selectedModel ||
      conv.model ||
      process.env.CHAT_MODEL ||
      'minimax/minimax-m2.5';
    const apiKey = settings.openRouterKey || process.env.OPENROUTER_API_KEY;
    const isVisionModel = VISION_MODELS.has(model);

    // Build conversation history
    const history = await db
      .select({ role: messages.role, content: messages.content, metadata: messages.metadata })
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.createdAt));

    // Build dynamic system prompt from identity system + memory context
    const systemPrompt = await assembleContext(req.userId, content);

    const chatMessages: Array<Record<string, unknown>> = [
      { role: 'system', content: systemPrompt },
    ];

    // Track if the current (latest) message has images for the warning
    let latestMessageHasImages = false;

    for (const m of history) {
      const meta = m.metadata as Record<string, unknown> | null;
      const msgAttachments = (meta?.attachments as Array<Record<string, unknown>>) || [];

      if (m.role === 'user' && msgAttachments.length > 0) {
        const hasImages = msgAttachments.some((a) => (a.mimeType as string)?.startsWith('image/'));

        if (hasImages && isVisionModel) {
          // Vision model: include image_url parts
          const parts: Array<Record<string, unknown>> = [{ type: 'text', text: m.content }];

          for (const att of msgAttachments) {
            const mime = att.mimeType as string;
            if (mime?.startsWith('image/')) {
              // Try local file first for base64, fall back to URL
              const localPath = att.path as string;
              let imageUrl: string;
              if (localPath && fs.existsSync(localPath)) {
                const b64 = imageToBase64DataUrl(localPath, mime);
                imageUrl = b64 || `${process.env.BASE_URL || 'http://localhost:3001'}${att.url}`;
              } else {
                const url = att.url as string;
                imageUrl = url?.startsWith('http') ? url : `${process.env.BASE_URL || 'http://localhost:3001'}${url}`;
              }
              parts.push({
                type: 'image_url',
                image_url: { url: imageUrl },
              });
            } else {
              const sizeKB = Math.ceil((att.size as number) / 1024);
              const typeLabel = mime?.split('/').pop()?.toUpperCase() || 'File';
              parts[0] = {
                type: 'text',
                text: `${(parts[0] as any).text}\n[User attached: ${att.originalName} (${typeLabel}, ${sizeKB}KB)]`,
              };
            }
          }

          chatMessages.push({ role: 'user', content: parts });
        } else if (hasImages && !isVisionModel) {
          // Non-vision model: strip images, keep text with attachment note
          latestMessageHasImages = true;
          let augmented = m.content;
          for (const att of msgAttachments) {
            const sizeKB = Math.ceil((att.size as number) / 1024);
            const mime = att.mimeType as string;
            const typeLabel = mime?.split('/').pop()?.toUpperCase() || 'File';
            augmented += `\n[User attached: ${att.originalName} (${typeLabel}, ${sizeKB}KB) — image not sent to model]`;
          }
          chatMessages.push({ role: m.role as string, content: augmented });
        } else {
          // Text-only attachments
          let augmented = m.content;
          for (const att of msgAttachments) {
            const sizeKB = Math.ceil((att.size as number) / 1024);
            const typeLabel = (att.mimeType as string)?.split('/').pop()?.toUpperCase() || 'File';
            augmented += `\n[User attached: ${att.originalName} (${typeLabel}, ${sizeKB}KB)]`;
          }
          chatMessages.push({ role: m.role as string, content: augmented });
        }
      } else {
        chatMessages.push({ role: m.role as string, content: m.content });
      }
    }

    if (!apiKey) {
      const [assistantMsg] = await db
        .insert(messages)
        .values({
          conversationId: id,
          userId: req.userId,
          role: 'assistant',
          content: 'No API key configured. Go to **Settings → Connections** and add your OpenRouter API key.',
        })
        .returning();
      success(res, { userMessage: userMsg, assistantMessage: assistantMsg });
      return;
    }

    // SSE setup
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    let clientGone = false;
    const safeSend = (data: string) => {
      if (clientGone) return;
      try { res.write(data); } catch { clientGone = true; }
    };
    res.on('close', () => { clientGone = true; });

    // Keep-alive heartbeat for long responses
    const heartbeat = setInterval(() => {
      safeSend(`data: ${JSON.stringify({ type: 'keepalive' })}\n\n`);
    }, 5_000);

    safeSend(`data: ${JSON.stringify({ type: 'user_message', message: userMsg })}\n\n`);

    try { // outer try — ensures heartbeat cleanup + res.end()

    // Warn if user sent images but model doesn't support vision
    if (latestMessageHasImages && !isVisionModel) {
      const modelName = model.split('/').pop() || model;
      safeSend(`data: ${JSON.stringify({
        type: 'delta',
        content: `⚠️ The current model (${modelName}) doesn't support image analysis. Switch to a vision-capable model in Settings (e.g., GPT-4.1, Claude Sonnet, Gemini Flash) to analyze images.\n\n`,
      })}\n\n`);
    }

    // ── Prompt Enhancement (toggleable per user, 3s timeout) ──
    let enhancedInput = content;
    let promptLogId: string | undefined;
    let enhancementMeta: Record<string, unknown> | undefined;

    // Check user setting (default: enabled)
    const promptEnhancementEnabled = settings.prompt_enhancement !== 'false';

    if (enhancePrompt && apiKey && promptEnhancementEnabled) {
      try {
        const enhanceWithTimeout = Promise.race([
          enhancePrompt(
            req.userId,
            content,
            history.map((m: any) => ({ role: m.role, content: m.content })),
            apiKey,
            'openai/gpt-4.1-nano',
          ),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Prompt enhancement timeout (3s)')), 3000)),
        ]);

        const enhancement = await enhanceWithTimeout as any;
        enhancedInput = enhancement.enhancedPrompt;
        promptLogId = enhancement.id;
        enhancementMeta = {
          enhanced: true,
          originalLength: content.length,
          enhancedLength: enhancedInput.length,
          promptLogId: enhancement.id,
          latencyMs: enhancement.latencyMs,
        };

        safeSend(`data: ${JSON.stringify({
          type: 'enhancement',
          original: content,
          enhanced: enhancedInput,
          stages: enhancement.stages,
        })}\n\n`);
      } catch (e) {
        console.error('Prompt enhancement failed (falling through to raw input):', e);
        // Fall through — enhancedInput remains raw content
      }
    }

    // Update user message metadata with enhancement info (original stored as content)
    if (enhancementMeta) {
      try {
        const existingMeta = (metadata || {}) as Record<string, unknown>;
        await db
          .update(messages)
          .set({ metadata: { ...existingMeta, ...enhancementMeta } })
          .where(eq(messages.id, userMsg.id));
      } catch (e) {
        console.error('Failed to update message enhancement metadata:', e);
      }
    }

    // Tool use loop (max 10 rounds for complex multi-step tasks)
    let finalContent = '';
    let currentMessages = [...chatMessages];

    // Replace last user message content with enhanced version
    if (enhancedInput !== content) {
      const lastIdx = currentMessages.length - 1;
      if (lastIdx >= 0 && (currentMessages[lastIdx] as any).role === 'user') {
        const last = currentMessages[lastIdx] as any;
        if (typeof last.content === 'string') {
          currentMessages[lastIdx] = { ...last, content: enhancedInput };
        }
      }
    }

    for (let round = 0; round < 10; round++) {
      safeSend(`data: ${JSON.stringify({ type: 'thinking', round })}\n\n`);

      try {
        const apiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: currentMessages,
            tools: TOOLS,
            stream: true,
          }),
        });

        if (!apiResponse.ok || !apiResponse.body) {
          const errText = await apiResponse.text();
          safeSend(`data: ${JSON.stringify({ type: 'error', error: errText })}\n\n`);
          break;
        }

        const reader = apiResponse.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let textContent = '';
        let toolCalls: Array<{ id: string; function: { name: string; arguments: string } }> = [];
        let currentToolCall: { id: string; function: { name: string; arguments: string } } | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const choice = parsed.choices?.[0];
              if (!choice) continue;

              const delta = choice.delta;

              // Text content
              if (delta?.content) {
                textContent += delta.content;
                safeSend(`data: ${JSON.stringify({ type: 'delta', content: delta.content })}\n\n`);
              }

              // Tool calls
              if (delta?.tool_calls) {
                for (const tc of delta.tool_calls) {
                  if (tc.id) {
                    // New tool call
                    if (currentToolCall) toolCalls.push(currentToolCall);
                    currentToolCall = {
                      id: tc.id,
                      function: { name: tc.function?.name || '', arguments: tc.function?.arguments || '' },
                    };
                  } else if (currentToolCall && tc.function?.arguments) {
                    currentToolCall.function.arguments += tc.function.arguments;
                  }
                  if (tc.function?.name && currentToolCall) {
                    currentToolCall.function.name = tc.function.name;
                  }
                }
              }
            } catch {
              // skip
            }
          }
        }

        if (currentToolCall) toolCalls.push(currentToolCall);

        // If no tool calls, we have the final response
        if (toolCalls.length === 0) {
          finalContent = textContent;
          break;
        }

        // Execute tool calls
        currentMessages.push({
          role: 'assistant',
          content: textContent || null,
          tool_calls: toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function',
            function: { name: tc.function.name, arguments: tc.function.arguments },
          })),
        });

        for (const tc of toolCalls) {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(tc.function.arguments);
          } catch {}

          safeSend(
            `data: ${JSON.stringify({
              type: 'tool_call',
              name: tc.function.name,
              args,
              callId: tc.id,
            })}\n\n`,
          );

          const result = await executeTool(tc.function.name, args, req.userId);

          safeSend(
            `data: ${JSON.stringify({
              type: 'tool_result',
              name: tc.function.name,
              result: JSON.parse(result),
              callId: tc.id,
            })}\n\n`,
          );

          currentMessages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: result,
          });
        }

        // Continue the loop — model will process tool results
      } catch (err: any) {
        safeSend(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
        break;
      }
    }

    // Store final assistant message — always persist even if client disconnected
    if (finalContent) {
      const [assistantMsg] = await db
        .insert(messages)
        .values({
          conversationId: id,
          userId: req.userId,
          role: 'assistant',
          content: finalContent,
          metadata: { model },
        })
        .returning();

      await db
        .update(conversations)
        .set({ updatedAt: sql`now()` })
        .where(eq(conversations.id, id));

      safeSend(`data: ${JSON.stringify({ type: 'assistant_message', message: assistantMsg })}\n\n`);

      // Fire-and-forget post-processing
      postProcessMessage(req.userId, id, finalContent).catch(console.error);

      // Record context efficiency metrics
      recordContextMetrics({
        userId: req.userId,
        conversationId: id,
        messageId: assistantMsg.id,
        systemPrompt: systemPrompt,
        historyMessages: chatMessages.slice(1), // exclude system prompt
        response: finalContent,
      }).catch(console.error);

      // Score the enhanced prompt
      if (scorePrompt && promptLogId) {
        scorePrompt(promptLogId, 'accepted').catch(console.error);
      }

      // Store short-term memory (legacy)
      if (remember) {
        remember(
          req.userId,
          'interaction',
          `User asked about: ${content.slice(0, 100)}. Agent responded about: ${finalContent.slice(0, 100)}`,
          id,
        ).catch(console.error);
      }

      // Heuristic memory extraction — sync extract (<5ms), async DB writes
      if (extractFacts && storeInWorking && promoteToShortTerm) {
        try {
          const extracted = extractFacts(content, finalContent);
          if (extracted.length > 0) {
            storeInWorking(id, extracted);
            promoteToShortTerm(req.userId, id, extracted).catch(console.error);
          }
        } catch (e) { console.error('[memory-wire] extraction error:', e); }
      }
    }

    safeSend('data: [DONE]\n\n');
    } finally { // outer finally — always clean up
      clearInterval(heartbeat);
      try { if (!res.writableEnded) res.end(); } catch {}
    }
  }),
);

// Rename conversation
chatRouter.patch(
  '/conversations/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    if (!isUuid(id)) { validationError(res, 'Invalid conversation ID'); return; }

    const body = asRecord(req.body);
    const title = getTrimmedString(body.title);
    if (!title) { validationError(res, 'title is required'); return; }

    const [updated] = await db
      .update(conversations)
      .set({ title })
      .where(and(eq(conversations.id, id), eq(conversations.userId, req.userId)))
      .returning();
    if (!updated) { notFound(res, 'Conversation not found'); return; }

    success(res, updated);
  }),
);

// Delete conversation
chatRouter.delete(
  '/conversations/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    if (!isUuid(id)) { validationError(res, 'Invalid conversation ID'); return; }

    const [deleted] = await db
      .delete(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, req.userId)))
      .returning();
    if (!deleted) { notFound(res, 'Conversation not found'); return; }

    success(res, { deleted: true });
  }),
);

export { chatRouter };
