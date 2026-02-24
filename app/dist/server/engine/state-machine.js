const transitionsByEntity = {
    task: {
        todo: ['in_progress'],
        in_progress: ['waiting', 'review', 'done'],
        waiting: ['in_progress'],
        review: ['in_progress', 'done'],
        done: [],
        cancelled: [],
    },
    project: {
        planning: ['active'],
        active: ['blocked', 'review', 'completed'],
        blocked: ['active'],
        review: ['active', 'completed'],
        completed: [],
        archived: [],
    },
    objective: {
        active: ['completed', 'failed', 'deferred'],
        completed: [],
        failed: [],
        deferred: [],
    },
};
const wildcardTargetsByEntity = {
    task: ['cancelled'],
    project: ['archived'],
    objective: [],
};
export function validateTransition(entityType, currentStatus, newStatus) {
    if (currentStatus === newStatus) {
        return { valid: true };
    }
    const transitions = transitionsByEntity[entityType];
    const explicitTargets = transitions[currentStatus] ?? [];
    const wildcardTargets = wildcardTargetsByEntity[entityType];
    const allowedTargets = new Set([...explicitTargets, ...wildcardTargets]);
    if (allowedTargets.has(newStatus)) {
        return { valid: true };
    }
    return {
        valid: false,
        error: `Cannot transition ${entityType} from '${currentStatus}' to '${newStatus}'`,
    };
}
export function isTaskStatus(value) {
    return value in transitionsByEntity.task;
}
export function canTransitionTaskStatus(from, to) {
    return validateTransition('task', from, to).valid;
}
//# sourceMappingURL=state-machine.js.map