/**
 * Context Efficiency Monitor
 *
 * Measures how efficiently each chat request uses its context window.
 * Tracks system prompt tokens, history tokens, response tokens, and
 * which sections of context were actually referenced in the response.
 */
export declare function estimateTokens(text: string): number;
/** Detect which context sections are present in the system prompt */
export declare function detectSections(systemPrompt: string): string[];
/** Check which sections were actually referenced in the response */
export declare function detectReferencedSections(systemPrompt: string, response: string): string[];
/** Classify efficiency score */
export declare function classifyEfficiency(score: number): string;
export interface ContextMetricsInput {
    userId: string;
    conversationId: string;
    messageId: string;
    systemPrompt: string;
    historyMessages: Array<{
        role: string;
        content: string | unknown;
    }>;
    response: string;
}
export declare function recordContextMetrics(input: ContextMetricsInput): Promise<void>;
