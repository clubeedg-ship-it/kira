export interface WorkingMemory {
    activeTasksSummary: string;
    currentConversationSummary: string;
    recentArtifacts: string[];
    lastUpdated: string;
}
export declare function getWorkingMemory(userId: string, conversationId: string): Promise<WorkingMemory>;
export declare function updateConversationSummary(userId: string, conversationId: string, msgs: Array<{
    role: string;
    content: string;
}>): Promise<void>;
