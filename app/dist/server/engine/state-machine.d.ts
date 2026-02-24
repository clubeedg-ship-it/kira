declare const transitionsByEntity: {
    readonly task: {
        readonly todo: readonly ["in_progress"];
        readonly in_progress: readonly ["waiting", "review", "done"];
        readonly waiting: readonly ["in_progress"];
        readonly review: readonly ["in_progress", "done"];
        readonly done: readonly [];
        readonly cancelled: readonly [];
    };
    readonly project: {
        readonly planning: readonly ["active"];
        readonly active: readonly ["blocked", "review", "completed"];
        readonly blocked: readonly ["active"];
        readonly review: readonly ["active", "completed"];
        readonly completed: readonly [];
        readonly archived: readonly [];
    };
    readonly objective: {
        readonly active: readonly ["completed", "failed", "deferred"];
        readonly completed: readonly [];
        readonly failed: readonly [];
        readonly deferred: readonly [];
    };
};
export type EntityType = keyof typeof transitionsByEntity;
export type TaskStatus = keyof (typeof transitionsByEntity)['task'];
export type ProjectStatus = keyof (typeof transitionsByEntity)['project'];
export type ObjectiveStatus = keyof (typeof transitionsByEntity)['objective'];
export interface TransitionValidationResult {
    valid: boolean;
    error?: string;
}
export declare function validateTransition(entityType: EntityType, currentStatus: string, newStatus: string): TransitionValidationResult;
export declare function isTaskStatus(value: string): value is TaskStatus;
export declare function canTransitionTaskStatus(from: TaskStatus, to: TaskStatus): boolean;
export {};
