import { getWorkingMemory } from './working';
import { getUserPreferences, getRelevantPatterns } from './procedural';
import { buildMem0Context } from './mem0-service';
const MAX_CHARS = 6000; // Increased — Mem0 returns ranked, relevant results
function estimateTokens(text) {
    return Math.ceil(text.length / 4);
}
function truncate(text, maxChars) {
    if (text.length <= maxChars)
        return text;
    return text.slice(0, maxChars - 3) + '...';
}
export async function buildMemoryContext(userId, conversationId, currentInput) {
    // L1: Working Memory (highest priority — active conversation state)
    let workingMemoryText = '';
    try {
        const wm = await getWorkingMemory(userId, conversationId);
        workingMemoryText = `Active Tasks:\n${wm.activeTasksSummary}\n\nConversation:\n${wm.currentConversationSummary}`;
    }
    catch {
        workingMemoryText = '';
    }
    // L2+L3: Mem0 — semantic search across all stored memories
    // Replaces both short-term recall AND knowledge graph query
    // Mem0 handles: vector similarity, dedup, ranking, temporal awareness
    let relevantKnowledgeText = '';
    try {
        relevantKnowledgeText = await buildMem0Context(currentInput, userId, {
            agentId: 'kira',
            maxChars: Math.floor(MAX_CHARS * 0.5),
            limit: 15,
        });
    }
    catch {
        relevantKnowledgeText = '';
    }
    // L4: Procedural (preferences + learned patterns — our differentiator)
    let proceduralText = '';
    try {
        const prefs = await getUserPreferences(userId);
        const prefEntries = Object.entries(prefs).slice(0, 10);
        if (prefEntries.length > 0) {
            proceduralText = 'Preferences:\n' + prefEntries.map(([k, v]) => `- ${k}: ${v}`).join('\n');
        }
        const patterns = await getRelevantPatterns(userId, currentInput);
        if (patterns.length > 0) {
            proceduralText +=
                '\nPatterns:\n' + patterns.map((p) => `- ${p.intentType}: ${p.template.slice(0, 100)}`).join('\n');
        }
    }
    catch {
        proceduralText = '';
    }
    // Dynamic budget: Mem0 results are already ranked by relevance,
    // so give them more space. Working memory gets priority for active context.
    const hasWorkingMemory = workingMemoryText.length > 30;
    const workingBudget = hasWorkingMemory ? Math.floor(MAX_CHARS * 0.3) : 0;
    const knowledgeBudget = Math.floor(MAX_CHARS * (hasWorkingMemory ? 0.55 : 0.8));
    const proceduralBudget = Math.floor(MAX_CHARS * 0.15);
    workingMemoryText = truncate(workingMemoryText, workingBudget);
    relevantKnowledgeText = truncate(relevantKnowledgeText, knowledgeBudget);
    proceduralText = truncate(proceduralText, proceduralBudget);
    const totalText = workingMemoryText + relevantKnowledgeText + proceduralText;
    return {
        workingMemory: workingMemoryText,
        shortTermMemory: '', // Mem0 handles short-term + long-term unified
        relevantKnowledge: relevantKnowledgeText,
        proceduralHints: proceduralText,
        totalTokensEstimate: estimateTokens(totalText),
    };
}
//# sourceMappingURL=context-builder.js.map