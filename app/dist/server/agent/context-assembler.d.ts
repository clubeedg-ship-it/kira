type Classification = 'technical' | 'personal' | 'task' | 'creative' | 'question' | 'general';
export interface ContextMetadata {
    totalEstimatedTokens: number;
    sectionsIncluded: string[];
    memoriesIncluded: number;
    graphEntitiesIncluded: number;
    classification: Classification;
}
export interface AssembledContext {
    prompt: string;
    metadata: ContextMetadata;
}
export declare function assembleContext(userId: string, userMessage?: string): Promise<string>;
export declare function assembleContext(userId: string, userMessage: string, withMetadata: true): Promise<AssembledContext>;
export {};
