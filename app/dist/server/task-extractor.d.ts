/**
 * LLM-powered task extraction from conversations.
 * Uses Kimi K2.5 via OpenRouter for cheap, accurate extraction.
 *
 * Replaces the regex-based extractTasks in chat-postprocess.ts.
 * Extracts: tasks, goals, decisions, blockers from conversation turns.
 */
interface ExtractedTask {
    title: string;
    description?: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    executor: 'user' | 'agent';
    area?: string;
    type: 'task' | 'goal' | 'decision' | 'blocker';
}
interface ExtractionResult {
    items: ExtractedTask[];
    summary?: string;
}
/**
 * Extract tasks from a conversation turn using LLM.
 * Fire-and-forget — never blocks chat response.
 */
export declare function extractTasksLLM(userId: string, conversationId: string, assistantContent: string, userContent?: string): Promise<ExtractionResult | null>;
export {};
