/**
 * Post-process assistant messages after they're stored.
 * Fire-and-forget — never block the chat response.
 *
 * Uses Mem0 for intelligent memory extraction (replaces heuristic NLP).
 */
export declare function postProcessMessage(userId: string, conversationId: string, content: string, userContent?: string): Promise<void>;
