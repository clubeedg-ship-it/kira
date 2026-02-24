import { promptPatterns } from '../db/schema';
type PromptPattern = typeof promptPatterns.$inferSelect;
/**
 * Find a matching prompt pattern for this input.
 * Uses keyword overlap scoring against stored patterns.
 */
export declare function findMatchingPattern(userId: string, input: string): Promise<PromptPattern | null>;
/**
 * Update pattern score based on outcome using Bayesian-style scoring.
 */
export declare function updatePatternScore(patternId: string, success: boolean): Promise<void>;
/**
 * Create a new pattern from a successful enhancement.
 */
export declare function createPattern(userId: string, intentType: string, input: string, template: string): Promise<void>;
export {};
