/**
 * Working memory: in-memory per-session store.
 * Promotes important items to short-term (DB) asynchronously.
 */
import { ExtractedFact } from './extractor';
export declare function storeInWorking(conversationId: string, facts: ExtractedFact[]): void;
/**
 * Promote important working memory items to short-term DB.
 * Fire-and-forget — never blocks.
 */
export declare function promoteToShortTerm(userId: string, conversationId: string, facts: ExtractedFact[]): Promise<void>;
export declare function getWorkingFacts(conversationId: string): ExtractedFact[];
export declare function clearSession(conversationId: string): void;
