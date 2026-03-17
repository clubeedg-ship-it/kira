/**
 * LLM-powered task extraction from conversations.
 * Uses Kimi K2.5 via OpenRouter for cheap, accurate extraction.
 *
 * Replaces the regex-based extractTasks in chat-postprocess.ts.
 * Extracts: tasks, goals, decisions, blockers from conversation turns.
 */
import { db } from '../db/index';
import { tasks, extractedSuggestions, projects } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const EXTRACTION_MODEL = 'openai/gpt-4.1-nano';
const EXTRACTION_PROMPT = `You are a task extraction expert for a CEO's AI assistant.
Analyze the conversation and extract actionable items.

Extract ONLY clear, specific items. Do NOT extract:
- Vague mentions ("we should think about...")
- Already completed items ("I already did X")
- Questions without commitments
- General discussion or brainstorming without decisions

For each item, determine:
- title: concise action statement (5-15 words)
- description: optional detail (1-2 sentences max)
- priority: low/medium/high/critical
- executor: "user" (human must do it) or "agent" (AI can handle it)
- area: business area if clear (e.g., "IAM", "ZenithCred", "Omiximo", "Infrastructure")
- type: "task" (action item), "goal" (strategic objective), "decision" (choice made), "blocker" (impediment)

Return JSON only. No markdown. No explanation.
{"items": [...], "summary": "one line summary of conversation"}

If nothing actionable, return: {"items": [], "summary": "no actionable items"}`;
/**
 * Extract tasks from a conversation turn using LLM.
 * Fire-and-forget — never blocks chat response.
 */
export async function extractTasksLLM(userId, conversationId, assistantContent, userContent) {
    if (!OPENROUTER_API_KEY)
        return null;
    // Skip short or trivial messages
    const totalLen = (userContent?.length || 0) + assistantContent.length;
    if (totalLen < 50)
        return null;
    // Skip obvious non-task messages
    const trivialPatterns = /^(ok|thanks|got it|sure|hello|hi|hey|good morning|HEARTBEAT_OK|NO_REPLY)/i;
    if (trivialPatterns.test(assistantContent.trim()))
        return null;
    if (userContent && trivialPatterns.test(userContent.trim()))
        return null;
    try {
        const conversationText = [
            userContent ? `User: ${userContent.slice(0, 2000)}` : '',
            `Assistant: ${assistantContent.slice(0, 2000)}`,
        ].filter(Boolean).join('\n\n');
        const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: EXTRACTION_MODEL,
                messages: [
                    { role: 'system', content: EXTRACTION_PROMPT },
                    { role: 'user', content: conversationText },
                ],
                temperature: 0.1,
                max_tokens: 1000,
                response_format: { type: 'json_object' },
            }),
            signal: AbortSignal.timeout(30_000),
        });
        if (!resp.ok) {
            console.error(`[task-extract] LLM returned ${resp.status}`);
            return null;
        }
        const data = await resp.json();
        // Handle thinking models (Kimi K2.5) which may put content in reasoning
        let content = data.choices?.[0]?.message?.content;
        if (!content) {
            // Try reasoning field (thinking models)
            const reasoning = data.choices?.[0]?.message?.reasoning;
            if (reasoning)
                content = reasoning;
        }
        if (!content)
            return null;
        // Extract JSON from response (may be wrapped in markdown or reasoning text)
        const jsonMatch = content.match(/\{[\s\S]*"items"[\s\S]*\}/);
        if (!jsonMatch)
            return null;
        const parsed = JSON.parse(jsonMatch[0]);
        if (!parsed.items || !Array.isArray(parsed.items))
            return null;
        // Store extracted items
        if (parsed.items.length > 0) {
            await storeExtractedTasks(userId, conversationId, parsed.items);
            console.log(`[task-extract] Extracted ${parsed.items.length} items from conversation`);
        }
        return parsed;
    }
    catch (err) {
        console.error('[task-extract] Extraction error:', err.message);
        return null;
    }
}
/**
 * Store extracted tasks in the database.
 * Creates both suggestions (for review) and actual tasks (for immediate ones).
 */
async function storeExtractedTasks(userId, conversationId, items) {
    const priorityMap = {
        low: 0, medium: 1, high: 2, critical: 3,
    };
    for (const item of items) {
        try {
            // Store as suggestion first (user can approve/reject)
            await db.insert(extractedSuggestions).values({
                userId,
                conversationId,
                type: item.type || 'task',
                content: item.title,
                metadata: {
                    source: 'llm-extract',
                    description: item.description,
                    priority: item.priority,
                    executor: item.executor,
                    area: item.area,
                    model: EXTRACTION_MODEL,
                },
                status: 'pending',
            });
            // For high/critical items, also create an actual task
            if (item.priority === 'high' || item.priority === 'critical') {
                // Find matching area/project if specified
                let projectId = null;
                if (item.area) {
                    const [project] = await db
                        .select({ id: projects.id })
                        .from(projects)
                        .where(and(eq(projects.userId, userId), sql `LOWER(${projects.title}) LIKE LOWER(${'%' + item.area + '%'})`))
                        .limit(1);
                    projectId = project?.id || null;
                }
                await db.insert(tasks).values({
                    userId,
                    projectId,
                    title: item.title,
                    description: item.description || null,
                    status: 'todo',
                    priority: priorityMap[item.priority] ?? 1,
                    executorType: item.executor === 'agent' ? 'agent' : 'user',
                    requiresInput: 'none',
                    energy: item.priority === 'critical' ? 'high' : 'medium',
                    sortOrder: 0,
                });
            }
        }
        catch (err) {
            console.error(`[task-extract] Failed to store item "${item.title}":`, err.message);
        }
    }
}
//# sourceMappingURL=task-extractor.js.map