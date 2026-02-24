import type { Job } from 'bullmq';
import type { AgentWorkJobData } from './queue';
export declare function processAgentWorkJob(job: Job<AgentWorkJobData>): Promise<{
    taskId: string;
    agentId: string;
    finalStatus: string;
}>;
