import { Queue, type ConnectionOptions } from 'bullmq';
export interface AgentWorkJobData {
    userId: string;
    agentId: string;
    taskId: string;
}
export type HeartbeatCheckType = 'full' | 'quick';
export interface HeartbeatJobData {
    userId: string;
    checkType: HeartbeatCheckType;
}
export declare const AGENT_WORK_QUEUE_NAME = "agent-work";
export declare const HEARTBEAT_QUEUE_NAME = "heartbeat";
export declare const agentWorkQueue: Queue<AgentWorkJobData, unknown, string, AgentWorkJobData, unknown, string>;
export declare const heartbeatQueue: Queue<HeartbeatJobData, unknown, string, HeartbeatJobData, unknown, string>;
export declare function createRedisConnection(): ConnectionOptions;
export declare function buildAgentWorkJobId(userId: string, taskId: string): string;
