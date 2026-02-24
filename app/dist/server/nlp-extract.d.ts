/**
 * Lightweight NLP extraction — heuristic + regex, no external dependencies.
 * Designed for <10ms on typical chat messages.
 */
export interface ExtractedEntity {
    name: string;
    type: 'person' | 'company' | 'project' | 'tool' | 'concept' | 'date' | 'money' | 'unknown';
    confidence: number;
}
export interface ExtractedFact {
    subject: string;
    key: string;
    value: string;
    confidence: number;
}
export interface ExtractedRelation {
    source: string;
    target: string;
    type: string;
    confidence: number;
}
export interface ExtractionResult {
    entities: ExtractedEntity[];
    facts: ExtractedFact[];
    relations: ExtractedRelation[];
}
export declare function extractFromText(text: string): ExtractionResult;
export declare function mergeExtractions(...results: ExtractionResult[]): ExtractionResult;
export declare function extractWithLLM(text: string, apiKey: string, model: string, baseUrl?: string): Promise<ExtractionResult>;
