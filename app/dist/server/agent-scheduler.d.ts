declare const AGENT_RUNS_QUEUE = "user-agent-runs";
export { AGENT_RUNS_QUEUE };
export declare function scheduleAgent(agent: {
    id: string;
    userId: string;
    schedule: string | null;
    enabled: boolean;
}): Promise<void>;
export declare function unscheduleAgent(agentId: string): Promise<void>;
export declare function runAgentNow(agentId: string, userId: string): Promise<string>;
export declare function initializeAgentSchedules(): Promise<number>;
