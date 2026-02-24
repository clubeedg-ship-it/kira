/**
 * Working memory: in-memory per-session store.
 * Promotes important items to short-term (DB) asynchronously.
 */
import { remember } from './short-term';
// conversationId → entries
const sessions = new Map();
const MAX_PER_SESSION = 50;
const PROMOTE_THRESHOLD = 0.7;
export function storeInWorking(conversationId, facts) {
    if (facts.length === 0)
        return;
    let entries = sessions.get(conversationId);
    if (!entries) {
        entries = [];
        sessions.set(conversationId, entries);
    }
    const now = Date.now();
    for (const f of facts) {
        entries.push({ fact: f, timestamp: now });
    }
    // Evict oldest if over limit
    if (entries.length > MAX_PER_SESSION) {
        sessions.set(conversationId, entries.slice(-MAX_PER_SESSION));
    }
}
/**
 * Promote important working memory items to short-term DB.
 * Fire-and-forget — never blocks.
 */
export async function promoteToShortTerm(userId, conversationId, facts) {
    for (const f of facts) {
        if (f.importance >= PROMOTE_THRESHOLD) {
            await remember(userId, f.type, f.content, conversationId, f.importance);
        }
    }
}
export function getWorkingFacts(conversationId) {
    return (sessions.get(conversationId) || []).map(e => e.fact);
}
export function clearSession(conversationId) {
    sessions.delete(conversationId);
}
//# sourceMappingURL=session-store.js.map