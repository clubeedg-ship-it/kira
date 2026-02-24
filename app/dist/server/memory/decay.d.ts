/**
 * Memory decay and daily cleanup.
 * - Short-term entries older than 7 days lose 0.1 confidence/day
 * - Entries below 0.1 confidence are deleted
 */
/**
 * Apply decay to short-term memory entries older than 7 days.
 * Importance drops by 0.1 per day past the 7-day mark.
 */
export declare function applyDecay(): Promise<{
    decayed: number;
    deleted: number;
}>;
/**
 * Full daily cleanup: decay + promote + purge expired.
 * Call from cron or maintenance endpoint.
 */
export declare function dailyCleanup(): Promise<{
    decayed: number;
    deleted: number;
    factsDecayed: number;
}>;
