export interface MemoryContext {
    workingMemory: string;
    shortTermMemory: string;
    relevantKnowledge: string;
    proceduralHints: string;
    totalTokensEstimate: number;
}
export declare function buildMemoryContext(userId: string, conversationId: string, currentInput: string): Promise<MemoryContext>;
