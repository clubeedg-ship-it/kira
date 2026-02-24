export interface MemoryEntry {
    id: string;
    type: string;
    content: string;
    importance: number;
    createdAt: string;
}
export declare function remember(userId: string, type: string, content: string, conversationId?: string, importance?: number): Promise<void>;
export declare function recall(userId: string, query?: string, limit?: number): Promise<MemoryEntry[]>;
export declare function decayAndPromote(userId: string): Promise<{
    expired: number;
    promoted: number;
}>;
