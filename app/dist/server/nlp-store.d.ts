import type { ExtractionResult } from './nlp-extract';
/**
 * Upsert extracted entities, relations, and facts for a user.
 * Designed to be called fire-and-forget after chat messages.
 */
export declare function storeExtractions(userId: string, result: ExtractionResult): Promise<void>;
