export interface QueuedPrompt {
    id: string;
    text: string;
    files?: File[];
    queuedAt: number;
}
/**
 * Manages a queue of prompts that send one-by-one after each response.
 */
export declare function usePromptQueue(): {
    queue: QueuedPrompt[];
    enqueue: (text: string, files?: File[]) => string;
    dequeue: () => QueuedPrompt | null;
    remove: (id: string) => void;
    update: (id: string, text: string) => void;
    clear: () => void;
    peek: () => QueuedPrompt | null;
};
