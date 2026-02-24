export declare function runMaintenance(userId: string): Promise<{
    shortTermDecayed: number;
    shortTermPromoted: number;
    factsDecayed: number;
    stagingReviewed: number;
}>;
