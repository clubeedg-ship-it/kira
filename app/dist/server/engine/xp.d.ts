export declare function getLevelTitle(level: number): {
    title: string;
    icon: string;
};
export declare function calculateLevel(totalXp: number): {
    level: number;
    xpForCurrentLevel: number;
    xpForNextLevel: number;
    progress: number;
};
export declare function awardXP(userId: string, amount: number, reason: string, referenceId?: string): Promise<void>;
export declare function calculateTaskXP(task: {
    durationEst?: number | null;
}): number;
export declare function checkStreak(userId: string): Promise<void>;
