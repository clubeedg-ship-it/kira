export declare function onTaskComplete(userId: string, taskId: string): Promise<void>;
export declare function onProjectStatusChange(userId: string, projectId: string, _newStatus: string): Promise<void>;
export declare function onKeyResultUpdate(userId: string, keyResultId: string): Promise<void>;
export declare function onParentArchived(userId: string, entityType: 'area' | 'objective' | 'project', entityId: string): Promise<void>;
