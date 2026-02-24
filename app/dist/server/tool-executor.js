import { and, eq } from 'drizzle-orm';
import { db } from '../db/index';
import { tasks, projects, documents, entities } from '../db/schema';
import { executeCode, listWorkspaceFiles, readWorkspaceFile, writeWorkspaceFile, } from './sandbox';
/**
 * Shared tool execution logic used by both chat routes and agent executor.
 */
export async function executeTool(toolName, args, userId) {
    switch (toolName) {
        case 'execute_code': {
            const code = args.code || '';
            const lang = args.language || 'bash';
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
            const filename = args.filename || '';
            const content = readWorkspaceFile(userId, filename);
            if (content === null)
                return JSON.stringify({ error: `File not found: ${filename}` });
            return JSON.stringify({ filename, content: content.slice(0, 10000), size: content.length });
        }
        case 'write_file': {
            const filename = args.filename || '';
            const content = args.content || '';
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
                projectId: args.projectId || null,
                title: args.title || 'Untitled task',
                description: args.description || null,
                status: 'todo',
                priority: args.priority ?? 1,
                executorType: 'user',
                requiresInput: 'none',
                energy: 'medium',
                sortOrder: 0,
            })
                .returning();
            return JSON.stringify({ success: true, task: { id: task.id, title: task.title, status: task.status } });
        }
        case 'search_tasks': {
            const query = args.query || '';
            const status = args.status;
            let rows;
            if (status) {
                rows = await db
                    .select({ id: tasks.id, title: tasks.title, status: tasks.status, priority: tasks.priority })
                    .from(tasks)
                    .where(and(eq(tasks.userId, userId), eq(tasks.status, status)))
                    .limit(20);
            }
            else {
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
                title: args.title || 'Untitled',
                content: args.content || '',
            })
                .returning();
            return JSON.stringify({ success: true, document: { id: doc.id, title: doc.title } });
        }
        case 'search_knowledge': {
            const query = args.query || '';
            const type = args.type;
            const q = query.toLowerCase();
            let rows;
            if (type) {
                rows = await db
                    .select({ id: entities.id, name: entities.name, type: entities.type })
                    .from(entities)
                    .where(and(eq(entities.userId, userId), eq(entities.type, type)))
                    .limit(20);
            }
            else {
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
        default:
            return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
}
/** The TOOLS array in OpenAI function-calling format */
export const TOOL_DEFINITIONS = [
    {
        type: 'function',
        function: {
            name: 'execute_code',
            description: 'Execute code in a sandboxed environment.',
            parameters: {
                type: 'object',
                properties: {
                    code: { type: 'string', description: 'The code to execute' },
                    language: { type: 'string', enum: ['bash', 'python', 'javascript'] },
                },
                required: ['code', 'language'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'search_tasks',
            description: "Search the user's tasks by keyword or status.",
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string' },
                    status: { type: 'string', enum: ['todo', 'in_progress', 'done', 'blocked'] },
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'list_projects',
            description: "List the user's projects.",
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
    {
        type: 'function',
        function: {
            name: 'search_knowledge',
            description: 'Search the knowledge graph.',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string' },
                    type: { type: 'string', enum: ['person', 'company', 'project', 'concept', 'decision', 'event'] },
                },
                required: ['query'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'create_task',
            description: 'Create a new task.',
            parameters: {
                type: 'object',
                properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    priority: { type: 'number', enum: [0, 1, 2, 3] },
                    projectId: { type: 'string' },
                },
                required: ['title'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'create_document',
            description: 'Create a document.',
            parameters: {
                type: 'object',
                properties: {
                    title: { type: 'string' },
                    content: { type: 'string' },
                },
                required: ['title', 'content'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'read_file',
            description: "Read a file from workspace.",
            parameters: {
                type: 'object',
                properties: { filename: { type: 'string' } },
                required: ['filename'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'write_file',
            description: "Write a file to workspace.",
            parameters: {
                type: 'object',
                properties: {
                    filename: { type: 'string' },
                    content: { type: 'string' },
                },
                required: ['filename', 'content'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'list_files',
            description: "List workspace files.",
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
];
//# sourceMappingURL=tool-executor.js.map