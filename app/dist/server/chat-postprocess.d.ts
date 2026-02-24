/**
 * Post-process assistant messages after they're stored.
 * Fire-and-forget — never block the chat response.
 */
export declare function postProcessMessage(userId: string, conversationId: string, content: string, userContent?: string): Promise<void>;
