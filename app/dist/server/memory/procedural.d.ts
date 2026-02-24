import { promptPatterns } from '../../db/schema';
type Pattern = typeof promptPatterns.$inferSelect;
export declare function getRelevantPatterns(userId: string, input: string): Promise<Pattern[]>;
export declare function getUserPreferences(userId: string): Promise<Record<string, string>>;
export declare function learnPreference(userId: string, key: string, value: string, source: 'explicit' | 'inferred'): Promise<void>;
export {};
