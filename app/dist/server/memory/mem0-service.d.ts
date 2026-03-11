/**
 * Mem0 Memory Service — SOTA memory layer for Kira
 *
 * Replaces: nlp-extract.ts (extraction), nlp-store.ts (storage),
 * graph-query.ts (retrieval), parts of context-builder.ts
 *
 * Keeps: episodic memory, reflection, procedural, blackboard (our differentiators)
 */
export interface Mem0SearchResult {
    id: string;
    memory: string;
    score?: number;
    metadata?: Record<string, unknown>;
    createdAt?: string;
    updatedAt?: string;
}
export interface Mem0AddResult {
    results: Mem0SearchResult[];
    relations?: Array<{
        source: string;
        target: string;
        type: string;
    }>;
}
/**
 * Add messages to memory. Call after each conversation turn.
 * Mem0 handles: extraction, deduplication, conflict resolution, storage.
 */
export declare function addToMemory(messages: Array<{
    role: string;
    content: string;
}>, opts: {
    userId: string;
    agentId?: string;
    sessionId?: string;
    metadata?: Record<string, unknown>;
}): Promise<Mem0AddResult | null>;
/**
 * Search memories relevant to a query.
 * Returns ranked results with scores.
 */
export declare function searchMemory(query: string, opts: {
    userId: string;
    agentId?: string;
    limit?: number;
}): Promise<Mem0SearchResult[]>;
/**
 * Get all memories for a user (for memory browser UI).
 */
export declare function getAllMemories(userId: string, agentId?: string): Promise<Mem0SearchResult[]>;
/**
 * Get a specific memory by ID.
 */
export declare function getMemoryById(memoryId: string): Promise<Mem0SearchResult | null>;
/**
 * Delete a specific memory.
 */
export declare function deleteMemory(memoryId: string): Promise<boolean>;
/**
 * Get memory history for a specific memory ID.
 */
export declare function getMemoryHistory(memoryId: string): Promise<unknown[]>;
/**
 * Build context string from relevant memories for injection into prompts.
 * This replaces context-builder.ts's knowledge graph portion.
 */
export declare function buildMem0Context(query: string, userId: string, opts?: {
    agentId?: string;
    maxChars?: number;
    limit?: number;
}): Promise<string>;
