interface PriorityTask {
    dueDate?: string | null;
    due_date?: string | null;
    priority?: number | null;
}
export declare function calculatePriority(task: PriorityTask, blockingCount: number): number;
export declare function recalculatePriorities(userId: string): Promise<void>;
export {};
