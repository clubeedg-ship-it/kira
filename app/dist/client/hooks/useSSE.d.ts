interface ParsedSseEvent {
    channel: string;
    data: unknown;
    timestamp: string | null;
    type: string;
}
interface UseSseResult {
    isConnected: boolean;
    lastEvent: ParsedSseEvent | null;
}
export declare function useSSE(): UseSseResult;
export {};
