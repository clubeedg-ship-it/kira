export declare function useTaskQueryParam(): {
    taskId: string | null;
    openTask: (nextTaskId: string) => void;
    closeTask: () => void;
};
