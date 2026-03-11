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
    toolResult?: unknown;
    error?: string;
}
export declare function setOnFinalMessage(cb: (text: string, runId?: string, userText?: string) => void): void;
export declare function notifyStreamStart(runId: string): void;
export declare function notifyStreamDelta(runId: string, accumulatedText: string): void;
export declare function notifyStreamEnd(): void;
export declare function getActivity(): AgentActivity;
export declare function addSSEClient(res: import('express').Response): string;
export declare function removeSSEClient(id: string): void;
export declare function initGatewayBridge(): void;
