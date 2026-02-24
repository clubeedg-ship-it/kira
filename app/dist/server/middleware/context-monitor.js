/**
 * Context Efficiency Monitor
 *
 * Measures how efficiently each chat request uses its context window.
 * Tracks system prompt tokens, history tokens, response tokens, and
 * which sections of context were actually referenced in the response.
 */
import { db } from '../../db/index';
import { contextMetrics } from '../../db/schema';
/* ── Token estimation ─────────────────────────────── */
export function estimateTokens(text) {
    if (!text)
        return 0;
    return Math.ceil(text.length / 4);
}
/* ── Section detection ────────────────────────────── */
const CONTEXT_SECTIONS = [
    { key: 'capabilities', pattern: /## Your Capabilities/i },
    { key: 'rules', pattern: /## Rules/i },
    { key: 'tasks', pattern: /Active tasks:/i },
    { key: 'projects', pattern: /Active projects:/i },
    { key: 'facts', pattern: /Known facts about user:/i },
    { key: 'workspace_files', pattern: /Workspace files:/i },
    { key: 'working_memory', pattern: /## Current Context/i },
    { key: 'relevant_knowledge', pattern: /## Relevant Knowledge/i },
    { key: 'short_term_memory', pattern: /## Recent Memory/i },
    { key: 'procedural_hints', pattern: /## Your Preferences/i },
];
/** Detect which context sections are present in the system prompt */
export function detectSections(systemPrompt) {
    return CONTEXT_SECTIONS
        .filter(s => s.pattern.test(systemPrompt))
        .map(s => s.key);
}
/** Check which sections were actually referenced in the response */
export function detectReferencedSections(systemPrompt, response) {
    const included = detectSections(systemPrompt);
    const responseLower = response.toLowerCase();
    return included.filter(section => {
        switch (section) {
            case 'tasks':
                return /task|todo|in.progress|blocked|priority/i.test(response);
            case 'projects':
                return /project|milestone/i.test(response);
            case 'facts':
                return /remember|fact|know about you/i.test(response);
            case 'workspace_files':
                return /file|workspace|\.md|\.ts|\.js/i.test(response);
            case 'working_memory':
                return /context|current|working on/i.test(response);
            case 'relevant_knowledge':
                return /knowledge|entity|relation/i.test(response);
            case 'short_term_memory':
                return /recent|earlier|before|last time/i.test(response);
            case 'procedural_hints':
                return /prefer|style|format/i.test(response);
            case 'capabilities':
                return /execute|code|sandbox|tool|search|agent/i.test(response);
            case 'rules':
                return false; // rules are meta, not directly referenced
            default:
                return false;
        }
    });
}
/** Classify efficiency score */
export function classifyEfficiency(score) {
    if (score >= 0.5)
        return 'excellent';
    if (score >= 0.3)
        return 'good';
    if (score >= 0.15)
        return 'moderate';
    if (score >= 0.05)
        return 'poor';
    return 'wasteful';
}
export async function recordContextMetrics(input) {
    try {
        const systemPromptTokens = estimateTokens(input.systemPrompt);
        const historyTokens = input.historyMessages.reduce((sum, m) => {
            const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
            return sum + estimateTokens(content);
        }, 0);
        const responseTokens = estimateTokens(input.response);
        const totalInputTokens = systemPromptTokens + historyTokens;
        const efficiencyScore = totalInputTokens > 0
            ? Math.min(1, responseTokens / totalInputTokens)
            : 0;
        const sectionsIncluded = detectSections(input.systemPrompt);
        const sectionsReferenced = detectReferencedSections(input.systemPrompt, input.response);
        const classification = classifyEfficiency(efficiencyScore);
        await db.insert(contextMetrics).values({
            userId: input.userId,
            conversationId: input.conversationId,
            messageId: input.messageId,
            systemPromptTokens,
            historyTokens,
            responseTokens,
            efficiencyScore,
            classification,
            sectionsIncluded: sectionsIncluded,
            sectionsReferenced: sectionsReferenced,
        });
    }
    catch (err) {
        console.error('[context-monitor] Failed to record metrics:', err);
    }
}
//# sourceMappingURL=context-monitor.js.map