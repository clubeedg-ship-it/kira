import Anthropic from '@anthropic-ai/sdk';
import { and, desc, eq, isNull, or, sql } from 'drizzle-orm';
import { db } from '../../db/index';
import { agentWorkLog, agents, inputQueue, principles, projects, tasks, } from '../../db/schema';
import { onTaskComplete } from '../engine/cascade';
import { assignAvailableTasks } from '../engine/orchestrator';
import { emitEvent } from '../events/sse';
import { uploadFile } from '../lib/s3';
const DEFAULT_MODEL = 'claude-sonnet-4-5-20250514';
const DEFAULT_MAX_TOKENS = 1_600;
const INPUT_QUEUE_TYPES = new Set(['verify', 'decide', 'create']);
const MODEL_PRICING_PER_MILLION = [
    {
        matcher: /claude-sonnet/i,
        input: 3,
        output: 15,
    },
    {
        matcher: /claude-haiku/i,
        input: 0.8,
        output: 4,
    },
];
let anthropicClient = null;
function getAnthropicClient() {
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) {
        return null;
    }
    if (!anthropicClient) {
        anthropicClient = new Anthropic({ apiKey });
    }
    return anthropicClient;
}
function getModelPricing(model) {
    for (const entry of MODEL_PRICING_PER_MILLION) {
        if (entry.matcher.test(model)) {
            return {
                input: entry.input,
                output: entry.output,
            };
        }
    }
    return {
        input: 3,
        output: 15,
    };
}
function estimateCostUsd(model, inputTokens, outputTokens) {
    const pricing = getModelPricing(model);
    const inputCost = (Math.max(0, inputTokens) / 1_000_000) * pricing.input;
    const outputCost = (Math.max(0, outputTokens) / 1_000_000) * pricing.output;
    return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}
function normalizeQueueType(raw) {
    const normalized = raw.trim().toLowerCase();
    if (INPUT_QUEUE_TYPES.has(normalized)) {
        return normalized;
    }
    return 'verify';
}
function buildSystemPrompt(context) {
    const principlesText = context.principles.length === 0
        ? '- No explicit principles found for this area.'
        : context.principles
            .map((principle) => {
            const rationale = principle.rationale ? ` Rationale: ${principle.rationale}` : '';
            return `- [${principle.domain}] ${principle.rule}${rationale}`;
        })
            .join('\n');
    return [
        `You are ${context.agent.name}, role: ${context.agent.role}.`,
        `Autonomy mode: ${context.agent.autonomy}.`,
        'Produce a concise, actionable markdown deliverable.',
        'Honor these principles when making decisions:',
        principlesText,
    ].join('\n');
}
function buildUserPrompt(context) {
    const projectLine = context.project
        ? `${context.project.title}${context.project.description ? ` — ${context.project.description}` : ''}`
        : 'No linked project';
    const recentWorkText = context.recentWork.length === 0
        ? '- No recent work log entries.'
        : context.recentWork
            .map((entry) => {
            const details = entry.details ? `: ${entry.details}` : '';
            return `- ${entry.createdAt} | ${entry.action}${details}`;
        })
            .join('\n');
    return [
        `Task: ${context.task.title}`,
        `Task description: ${context.task.description ?? 'No description provided.'}`,
        `Project context: ${projectLine}`,
        `Requires input: ${context.task.requiresInput}`,
        '',
        'Recent work log context:',
        recentWorkText,
        '',
        'Return markdown only. Include: Summary, Approach, Output, Risks/Unknowns, Next Steps.',
    ].join('\n');
}
function extractMessageText(response) {
    if (!response ||
        typeof response !== 'object' ||
        !('content' in response) ||
        !Array.isArray(response.content)) {
        return '';
    }
    const content = response.content;
    return content
        .filter((item) => item?.type === 'text' && typeof item.text === 'string')
        .map((item) => item.text)
        .join('\n')
        .trim();
}
function extractUsage(response) {
    if (!response ||
        typeof response !== 'object' ||
        !('usage' in response) ||
        typeof response.usage !== 'object' ||
        response.usage === null) {
        return {
            inputTokens: 0,
            outputTokens: 0,
        };
    }
    const usage = response.usage;
    const inputTokens = typeof usage.input_tokens === 'number' && Number.isFinite(usage.input_tokens)
        ? usage.input_tokens
        : 0;
    const outputTokens = typeof usage.output_tokens === 'number' && Number.isFinite(usage.output_tokens)
        ? usage.output_tokens
        : 0;
    return {
        inputTokens,
        outputTokens,
    };
}
async function sleep(ms) {
    await new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
async function generateAgentOutput(params) {
    const resolvedModel = params.model || DEFAULT_MODEL;
    const client = getAnthropicClient();
    if (!client) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('ANTHROPIC_API_KEY is not configured. Cannot run agent work in production without it.');
        }
        console.warn(`[agent-work] FALLBACK MODE: No API key. Generating placeholder for task "${params.taskTitle}"`);
        const fallback = [
            '## Simulated Agent Output',
            '',
            '[FALLBACK — No API Key]',
            '',
            `ANTHROPIC_API_KEY is not configured; generated fallback output for task "${params.taskTitle}".`,
            '',
            '### Summary',
            'Prepared a placeholder result in local development mode.',
            '',
            '### Next Steps',
            'Set ANTHROPIC_API_KEY to enable real model execution.',
        ].join('\n');
        return {
            text: fallback,
            tokensUsed: 0,
            costUsd: 0,
            model: resolvedModel,
            isFallback: true,
        };
    }
    let lastError = null;
    let cumulativeTokensUsed = 0;
    let cumulativeCostUsd = 0;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
            const response = await client.messages.create({
                model: resolvedModel,
                system: params.systemPrompt,
                max_tokens: DEFAULT_MAX_TOKENS,
                messages: [
                    {
                        role: 'user',
                        content: params.userPrompt,
                    },
                ],
            });
            const text = extractMessageText(response);
            const usage = extractUsage(response);
            const tokensUsed = usage.inputTokens + usage.outputTokens;
            const costUsd = estimateCostUsd(resolvedModel, usage.inputTokens, usage.outputTokens);
            return {
                text: text || 'No textual output returned by model.',
                tokensUsed: cumulativeTokensUsed + tokensUsed,
                costUsd: cumulativeCostUsd + costUsd,
                model: resolvedModel,
                isFallback: false,
            };
        }
        catch (error) {
            // Capture any partial usage from the failed response if available
            if (error && typeof error === 'object' && 'response' in error) {
                const errResponse = error.response;
                const usage = extractUsage(errResponse);
                const tokens = usage.inputTokens + usage.outputTokens;
                cumulativeTokensUsed += tokens;
                cumulativeCostUsd += estimateCostUsd(resolvedModel, usage.inputTokens, usage.outputTokens);
            }
            lastError = error;
            if (attempt < 3) {
                await sleep(attempt * 1_000);
            }
        }
    }
    if (process.env.NODE_ENV !== 'production') {
        const errorSummary = lastError instanceof Error ? lastError.message : 'Model request failed';
        console.warn(`[agent-work] FALLBACK MODE: API call failed ("${errorSummary}"). Generating placeholder for task "${params.taskTitle}"`);
        const fallback = [
            '## Simulated Agent Output',
            '',
            '[FALLBACK — API Error]',
            '',
            `Model call failed in development mode ("${errorSummary}"). Generated fallback output for "${params.taskTitle}".`,
            '',
            '### Summary',
            'Prepared a draft output based on available task context.',
            '',
            '### Risks/Unknowns',
            '- Model call failed; content should be reviewed before use.',
            '',
            '### Next Steps',
            '- Replace placeholder details with final reviewed deliverable.',
        ].join('\n');
        return {
            text: fallback,
            tokensUsed: cumulativeTokensUsed,
            costUsd: cumulativeCostUsd,
            model: resolvedModel,
            isFallback: true,
        };
    }
    // Attach cost info to the error for the caller to capture
    const finalError = lastError instanceof Error ? lastError : new Error('Anthropic generation failed');
    finalError.tokensUsed = cumulativeTokensUsed;
    finalError.costUsd = cumulativeCostUsd;
    throw finalError;
}
async function setAgentStatus(userId, agentId, nextStatus, previousStatusHint, currentTaskId) {
    let previousStatus = previousStatusHint;
    if (previousStatus === null) {
        const [agentRow] = await db
            .select({ status: agents.status })
            .from(agents)
            .where(and(eq(agents.userId, userId), eq(agents.id, agentId)))
            .limit(1);
        previousStatus = agentRow?.status ?? null;
    }
    await db
        .update(agents)
        .set({
        status: nextStatus,
        updatedAt: sql `now()`,
    })
        .where(and(eq(agents.userId, userId), eq(agents.id, agentId)));
    if (previousStatus && previousStatus !== nextStatus) {
        emitEvent(userId, 'agent', 'agent.status_changed', {
            id: agentId,
            agent_id: agentId,
            old_status: previousStatus,
            new_status: nextStatus,
            status: nextStatus,
            current_task: currentTaskId,
        });
    }
    return nextStatus;
}
async function setTaskStatus(userId, taskId, nextStatus, previousStatusHint, options = {}) {
    let previousStatus = previousStatusHint;
    if (previousStatus === null) {
        const [taskRow] = await db
            .select({ status: tasks.status })
            .from(tasks)
            .where(and(eq(tasks.userId, userId), eq(tasks.id, taskId)))
            .limit(1);
        previousStatus = taskRow?.status ?? null;
    }
    const updates = {
        status: nextStatus,
        updatedAt: sql `now()`,
    };
    if (Object.prototype.hasOwnProperty.call(options, 'completedAt')) {
        updates.completedAt = options.completedAt ?? null;
    }
    await db
        .update(tasks)
        .set(updates)
        .where(and(eq(tasks.userId, userId), eq(tasks.id, taskId)));
    if (previousStatus && previousStatus !== nextStatus) {
        emitEvent(userId, 'task', 'task.status_changed', {
            id: taskId,
            task_id: taskId,
            old_status: previousStatus,
            new_status: nextStatus,
            status: nextStatus,
        });
    }
    return nextStatus;
}
async function emitPendingInputCount(userId) {
    const [countRow] = await db
        .select({
        pendingCount: sql `count(*)::int`,
    })
        .from(inputQueue)
        .where(and(eq(inputQueue.userId, userId), eq(inputQueue.status, 'pending')));
    emitEvent(userId, 'input_queue', 'input_queue.count_changed', {
        pendingCount: Number(countRow?.pendingCount ?? 0),
    });
}
async function loadContext(userId, agentId, taskId) {
    const [[agentRow], [taskRow]] = await Promise.all([
        db
            .select({
            id: agents.id,
            name: agents.name,
            role: agents.role,
            autonomy: agents.autonomy,
            model: agents.model,
            status: agents.status,
        })
            .from(agents)
            .where(and(eq(agents.userId, userId), eq(agents.id, agentId)))
            .limit(1),
        db
            .select({
            id: tasks.id,
            title: tasks.title,
            description: tasks.description,
            status: tasks.status,
            requiresInput: tasks.requiresInput,
            priority: tasks.priority,
            projectId: tasks.projectId,
            areaId: projects.areaId,
        })
            .from(tasks)
            .leftJoin(projects, and(eq(projects.id, tasks.projectId), eq(projects.userId, userId)))
            .where(and(eq(tasks.userId, userId), eq(tasks.id, taskId)))
            .limit(1),
    ]);
    if (!agentRow) {
        throw new Error('Agent not found');
    }
    if (!taskRow) {
        throw new Error('Task not found');
    }
    const [projectRow, principleRows, recentWorkRows] = await Promise.all([
        taskRow.projectId
            ? db
                .select({
                id: projects.id,
                title: projects.title,
                description: projects.description,
                areaId: projects.areaId,
            })
                .from(projects)
                .where(and(eq(projects.userId, userId), eq(projects.id, taskRow.projectId)))
                .limit(1)
                .then((rows) => rows[0] ?? null)
            : Promise.resolve(null),
        db
            .select({
            domain: principles.domain,
            rule: principles.rule,
            rationale: principles.rationale,
        })
            .from(principles)
            .where(and(eq(principles.userId, userId), taskRow.areaId
            ? or(eq(principles.areaId, taskRow.areaId), isNull(principles.areaId))
            : sql `true`))
            .orderBy(desc(principles.updatedAt))
            .limit(8),
        db
            .select({
            createdAt: agentWorkLog.createdAt,
            action: agentWorkLog.action,
            details: agentWorkLog.details,
        })
            .from(agentWorkLog)
            .where(and(eq(agentWorkLog.userId, userId), eq(agentWorkLog.agentId, agentId)))
            .orderBy(desc(agentWorkLog.createdAt))
            .limit(5),
    ]);
    return {
        agent: agentRow,
        task: taskRow,
        project: projectRow,
        principles: principleRows,
        recentWork: recentWorkRows,
    };
}
export async function processAgentWorkJob(job) {
    const startedAt = Date.now();
    const { userId, agentId, taskId } = job.data;
    let currentTaskStatus = null;
    let currentAgentStatus = null;
    let taskProjectId = null;
    let partialTokensUsed = 0;
    let partialCostUsd = 0;
    let partialModel = null;
    try {
        const context = await loadContext(userId, agentId, taskId);
        taskProjectId = context.task.projectId;
        currentTaskStatus = context.task.status;
        currentAgentStatus = context.agent.status;
        currentAgentStatus = await setAgentStatus(userId, agentId, 'working', currentAgentStatus, taskId);
        currentTaskStatus = await setTaskStatus(userId, taskId, 'in_progress', currentTaskStatus, {
            completedAt: null,
        });
        const systemPrompt = buildSystemPrompt(context);
        const userPrompt = buildUserPrompt(context);
        const model = context.agent.model || DEFAULT_MODEL;
        const output = await generateAgentOutput({
            model,
            systemPrompt,
            userPrompt,
            taskTitle: context.task.title,
        });
        // Capture cost data immediately so it's available even if post-processing fails
        partialTokensUsed = output.tokensUsed;
        partialCostUsd = output.costUsd;
        partialModel = output.model;
        const s3Key = `${userId}/${context.task.projectId ?? 'general'}/${taskId}.md`;
        const markdown = [
            `# ${context.task.title}`,
            '',
            `Generated by ${context.agent.name} at ${new Date().toISOString()}.`,
            '',
            output.text,
        ].join('\n');
        const outputUrl = await uploadFile(s3Key, markdown);
        const durationMs = Date.now() - startedAt;
        await db.insert(agentWorkLog).values({
            userId,
            agentId,
            taskId,
            projectId: context.task.projectId,
            action: 'task_completed',
            details: JSON.stringify({ model: output.model, fallback: output.isFallback }),
            outputRef: outputUrl,
            tokensUsed: output.tokensUsed,
            costUsd: output.costUsd,
            durationMs,
        });
        if (context.task.requiresInput !== 'no') {
            const queueType = normalizeQueueType(context.task.requiresInput);
            const [queueItem] = await db
                .insert(inputQueue)
                .values({
                userId,
                taskId,
                agentId,
                queueType,
                title: `Review output: ${context.task.title}`,
                description: `Agent ${context.agent.name} produced an output and requested ${queueType} input.`,
                deliverable: outputUrl,
                areaId: context.project?.areaId ?? context.task.areaId ?? null,
                priority: context.task.priority,
                status: 'pending',
            })
                .returning();
            currentTaskStatus = await setTaskStatus(userId, taskId, 'waiting', currentTaskStatus);
            emitEvent(userId, 'input_queue', 'input_queue.item_added', queueItem);
            await emitPendingInputCount(userId);
        }
        else {
            currentTaskStatus = await setTaskStatus(userId, taskId, 'done', currentTaskStatus, {
                completedAt: new Date().toISOString(),
            });
            await onTaskComplete(userId, taskId);
            emitEvent(userId, 'agent', 'agent.work_completed', {
                agent_id: agentId,
                task_id: taskId,
                output_ref: outputUrl,
                fallback: output.isFallback,
            });
        }
        currentAgentStatus = await setAgentStatus(userId, agentId, 'idle', currentAgentStatus, null);
        await assignAvailableTasks(userId);
        return {
            taskId,
            agentId,
            finalStatus: currentTaskStatus ?? 'done',
        };
    }
    catch (error) {
        const durationMs = Date.now() - startedAt;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        // Also capture any cost info attached to the error by generateAgentOutput
        if (error && typeof error === 'object') {
            const errAny = error;
            if (typeof errAny.tokensUsed === 'number' && errAny.tokensUsed > partialTokensUsed) {
                partialTokensUsed = errAny.tokensUsed;
            }
            if (typeof errAny.costUsd === 'number' && errAny.costUsd > partialCostUsd) {
                partialCostUsd = errAny.costUsd;
            }
        }
        await db.insert(agentWorkLog).values({
            userId,
            agentId,
            taskId,
            projectId: taskProjectId,
            action: 'task_failed',
            details: JSON.stringify({
                error: errorMessage,
                model: partialModel,
                tokensUsed: partialTokensUsed,
                costUsd: partialCostUsd,
            }),
            tokensUsed: partialTokensUsed,
            costUsd: partialCostUsd,
            durationMs,
        });
        currentTaskStatus = await setTaskStatus(userId, taskId, 'todo', currentTaskStatus, {
            completedAt: null,
        });
        currentAgentStatus = await setAgentStatus(userId, agentId, 'idle', currentAgentStatus, null);
        throw error;
    }
}
//# sourceMappingURL=agent-work.js.map