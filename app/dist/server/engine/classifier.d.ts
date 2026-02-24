export type ExecutorType = 'agent' | 'human' | 'ambiguous';
export type RequiresInput = 'no' | 'verify' | 'decide' | 'create';
export interface TaskClassification {
    executor_type: ExecutorType;
    requires_input: RequiresInput;
}
export declare function classifyTask(title: string, _description?: string): TaskClassification;
