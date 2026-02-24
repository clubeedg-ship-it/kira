import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../db/index';
import { tasks, messages } from '../../db/schema';
// In-memory conversation summaries (could be moved to Redis/DB later)
const conversationSummaries = new Map();
export async function getWorkingMemory(userId, conversationId) {
    let activeTasksSummary = 'No active tasks.';
    try {
        const activeTasks = await db
            .select({ title: tasks.title, status: tasks.status, priority: tasks.priority })
            .from(tasks)
            .where(and(eq(tasks.userId, userId), sql `${tasks.status} != 'done'`))
            .orderBy(sql `${tasks.priority} desc`)
            .limit(10);
        if (activeTasks.length > 0) {
            activeTasksSummary = activeTasks
                .map((t) => `- [${t.status}] ${t.title} (P${t.priority})`)
                .join('\n');
        }
    }
    catch {
        // tasks table may not exist yet
    }
    let currentConversationSummary = conversationSummaries.get(`${userId}:${conversationId}`) || 'No conversation summary yet.';
    try {
        if (!conversationSummaries.has(`${userId}:${conversationId}`)) {
            const recentMessages = await db
                .select({ role: messages.role, content: messages.content })
                .from(messages)
                .where(eq(messages.conversationId, conversationId))
                .orderBy(sql `${messages.createdAt} desc`)
                .limit(10);
            const userMessages = recentMessages
                .filter((m) => m.role === 'user')
                .slice(0, 3)
                .reverse();
            if (userMessages.length > 0) {
                currentConversationSummary =
                    'Recent user messages:\n' + userMessages.map((m) => `- ${m.content.slice(0, 200)}`).join('\n');
            }
        }
    }
    catch {
        // messages table may not exist
    }
    return {
        activeTasksSummary,
        currentConversationSummary,
        recentArtifacts: [],
        lastUpdated: new Date().toISOString(),
    };
}
export async function updateConversationSummary(userId, conversationId, msgs) {
    const userMsgs = msgs.filter((m) => m.role === 'user').slice(-3);
    if (userMsgs.length === 0)
        return;
    const summary = 'Recent user messages:\n' + userMsgs.map((m) => `- ${m.content.slice(0, 200)}`).join('\n');
    conversationSummaries.set(`${userId}:${conversationId}`, summary);
}
//# sourceMappingURL=working.js.map