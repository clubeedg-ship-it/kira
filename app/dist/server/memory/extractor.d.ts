/**
 * Heuristic fact/entity extraction — no LLM calls.
 * Designed to run in <5ms on typical messages.
 */
export interface ExtractedFact {
    type: 'name' | 'date' | 'decision' | 'preference' | 'location' | 'contact' | 'fact';
    content: string;
    importance: number;
}
export declare function extractFacts(userMessage: string, assistantMessage: string): ExtractedFact[];
