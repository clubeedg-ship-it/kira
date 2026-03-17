/**
 * Post-process assistant messages after they're stored.
 * Fire-and-forget — never block the chat response.
 *
 * Uses Mem0 for intelligent memory extraction (replaces heuristic NLP).
 * Uses Kimi K2.5 for LLM-powered task extraction.
 */
export declare function postProcessMessage(userId: string, conversationId: string, content: string, userContent?: string): Promise<void>;
