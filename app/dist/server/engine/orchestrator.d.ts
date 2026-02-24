export interface AgentMatch {
    id: string;
    name: string;
    score: number;
    status: string;
    maxConcurrent: number;
    activeCount: number;
}
export interface EnqueuedAgentTask {
    jobId: string;
    taskId: string;
    agentId: string;
}
type OrchestratorErrorCode = 'NOT_FOUND' | 'VALIDATION_ERROR' | 'CAPACITY_REACHED';
export declare class OrchestratorError extends Error {
    readonly code: OrchestratorErrorCode;
    constructor(code: OrchestratorErrorCode, message: string);
}
export declare function getAgentForTask(userId: string, taskId: string): Promise<AgentMatch | null>;
export declare function assignAvailableTasks(userId: string): Promise<EnqueuedAgentTask[]>;
export declare function enqueueAgentTask(userId: string, agentId: string, taskId: string): Promise<EnqueuedAgentTask>;
export {};
