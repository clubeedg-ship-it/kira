export interface EnhancementResult {
    id: string;
    originalInput: string;
    enhancedPrompt: string;
    stages: {
        referenceResolution: string;
        intentExpansion: string;
        preferences: string[];
        chainOfThought: string[];
    };
    latencyMs: number;
}
interface ConversationMessage {
    role: string;
    content: string;
}
export declare function enhancePrompt(userId: string, rawInput: string, conversationHistory: ConversationMessage[], apiKey: string, model?: string): Promise<EnhancementResult>;
export declare function scorePrompt(logId: string, outcome: 'accepted' | 'edited' | 'reprompted' | 'rejected', feedback?: string): Promise<void>;
export {};
