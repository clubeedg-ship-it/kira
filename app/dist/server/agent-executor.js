import { eq } from 'drizzle-orm';
import { db } from '../db/index';
import { userAgents, agentRuns } from '../db/schema';
import { executeTool, TOOL_DEFINITIONS } from './tool-executor';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || '';
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const MAX_TOOL_ROUNDS = 10;
export async function executeAgent(agentId, userId) {
    // 1. Load agent config
    const [agent] = await db
        .select()
        .from(userAgents)
        .where(eq(userAgents.id, agentId))
        .limit(1);
    if (!agent) {
        console.error(`[agent-executor] Agent ${agentId} not found`);
        return;
    }
    // 2. Create run record
    const [run] = await db
        .insert(agentRuns)
        .values({
        agentId,
        userId,
        status: 'running',
        startedAt: new Date().toISOString(),
    })
        .returning();
    try {
        // 3. Filter tools based on agent config
        const allowedTools = Array.isArray(agent.tools) ? agent.tools : [];
        const tools = allowedTools.length > 0
            ? TOOL_DEFINITIONS.filter((t) => allowedTools.includes(t.function.name))
            : [];
        // 4. Build messages
        const messages = [
            { role: 'system', content: agent.systemPrompt },
        ];
        // 5. Call OpenRouter in a tool loop
        let totalTokens = 0;
        let finalOutput = '';
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
            const body = {
                model: agent.model,
                messages,
                temperature: 0.3,
            };
            if (tools.length > 0) {
                body.tools = tools;
            }
            const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                },
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`OpenRouter ${response.status}: ${errText}`);
            }
            const data = (await response.json());
            const choice = data.choices?.[0];
            if (!choice)
                throw new Error('No choices in response');
            totalTokens += data.usage?.total_tokens ?? 0;
            const msg = choice.message;
            // Add assistant message to history
            messages.push(msg);
            // If no tool calls, we're done
            if (!msg.tool_calls || msg.tool_calls.length === 0) {
                finalOutput = msg.content || '';
                break;
            }
            // Execute tool calls
            for (const tc of msg.tool_calls) {
                let args = {};
                try {
                    args = JSON.parse(tc.function.arguments || '{}');
                }
                catch { }
                const result = await executeTool(tc.function.name, args, userId);
                messages.push({
                    role: 'tool',
                    tool_call_id: tc.id,
                    content: result,
                });
            }
        }
        // 6. Update run as done
        await db
            .update(agentRuns)
            .set({
            status: 'done',
            output: finalOutput.slice(0, 50000),
            tokensUsed: totalTokens,
            finishedAt: new Date().toISOString(),
        })
            .where(eq(agentRuns.id, run.id));
        // 7. Update agent lastRunAt
        await db
            .update(userAgents)
            .set({
            lastRunAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        })
            .where(eq(userAgents.id, agentId));
    }
    catch (error) {
        console.error(`[agent-executor] Error running agent ${agentId}:`, error.message);
        await db
            .update(agentRuns)
            .set({
            status: 'error',
            error: (error.message || 'Unknown error').slice(0, 10000),
            finishedAt: new Date().toISOString(),
        })
            .where(eq(agentRuns.id, run.id));
        await db
            .update(userAgents)
            .set({
            lastRunAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        })
            .where(eq(userAgents.id, agentId));
    }
}
//# sourceMappingURL=agent-executor.js.map