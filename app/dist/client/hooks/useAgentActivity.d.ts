export interface AgentActivity {
    state: 'idle' | 'thinking' | 'streaming' | 'tool_call';
    sessionKey?: string;
    runId?: string;
    text?: string;
    toolName?: string;
    toolArgs?: Record<string, unknown>;
    startedAt?: number;
    updatedAt: number;
}
export interface ChatEvent {
    type: 'delta' | 'final' | 'thinking' | 'tool_call' | 'tool_result' | 'error';
    runId?: string;
    sessionKey?: string;
    text?: string;
    toolName?: string;
    toolArgs?: Record<string, unknown>;
    error?: string;
}
/**
 * Subscribe to real-time agent activity via SSE.
 * Survives page refresh — reconnects and gets current state immediately.
 */
export declare function useAgentActivity(): AgentActivity;
/**
 * Subscribe to real-time chat events (delta, final, thinking, tool_call, error).
 */
export declare function useChatEvents(onEvent: (e: ChatEvent) => void): void;
