import type { Job } from 'bullmq';
import type { HeartbeatCheckType, HeartbeatJobData } from './queue';
type FullCheckPhase = 'evening' | 'morning';
interface QuickCheckMetrics {
    staleInputItems: number;
    unblockedTasks: number;
    dueTodayWarnings: number;
    dueTomorrowWarnings: number;
    stuckAgents: number;
    overdueTasks: number;
}
interface FullCheckMetrics {
    phase: FullCheckPhase;
    reviewId: string;
    rescheduledTasks: number;
}
export interface HeartbeatRunResult {
    userId: string;
    checkType: HeartbeatCheckType;
    ranAt: string;
    quick: QuickCheckMetrics;
    full: FullCheckMetrics | null;
}
interface RunHeartbeatOptions {
    now?: Date;
    fullPhase?: FullCheckPhase | 'auto';
    source?: 'cli' | 'worker';
}
export declare function runHeartbeatCheck(data: HeartbeatJobData, options?: RunHeartbeatOptions): Promise<HeartbeatRunResult>;
export declare function processHeartbeatJob(job: Job<HeartbeatJobData>): Promise<HeartbeatRunResult>;
export {};
