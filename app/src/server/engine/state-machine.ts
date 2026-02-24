type TransitionMap = Record<string, readonly string[]>;

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
} as const satisfies Record<string, TransitionMap>;

const wildcardTargetsByEntity = {
  task: ['cancelled'],
  project: ['archived'],
  objective: [],
} as const satisfies Record<string, readonly string[]>;

export type EntityType = keyof typeof transitionsByEntity;
export type TaskStatus = keyof (typeof transitionsByEntity)['task'];
export type ProjectStatus = keyof (typeof transitionsByEntity)['project'];
export type ObjectiveStatus = keyof (typeof transitionsByEntity)['objective'];

export interface TransitionValidationResult {
  valid: boolean;
  error?: string;
}

export function validateTransition(
  entityType: EntityType,
  currentStatus: string,
  newStatus: string,
): TransitionValidationResult {
  if (currentStatus === newStatus) {
    return { valid: true };
  }

  const transitions = transitionsByEntity[entityType] as TransitionMap;
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

export function isTaskStatus(value: string): value is TaskStatus {
  return value in transitionsByEntity.task;
}

export function canTransitionTaskStatus(from: TaskStatus, to: TaskStatus): boolean {
  return validateTransition('task', from, to).valid;
}
