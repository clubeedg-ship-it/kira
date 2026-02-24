export type ExecutorType = 'agent' | 'human' | 'ambiguous';
export type RequiresInput = 'no' | 'verify' | 'decide' | 'create';

export interface TaskClassification {
  executor_type: ExecutorType;
  requires_input: RequiresInput;
}

const classificationRules: ReadonlyArray<{
  pattern: RegExp;
  result: TaskClassification;
}> = [
  {
    pattern: /\b(research|analyze|compare|find|investigate|scout)\b|\blook\s*up\b/i,
    result: {
      executor_type: 'agent',
      requires_input: 'verify',
    },
  },
  {
    pattern: /\b(draft|write|compose|email|message|reply)\b/i,
    result: {
      executor_type: 'agent',
      requires_input: 'verify',
    },
  },
  {
    pattern: /\b(decide|choose|pick|select)\b|\bevaluate\s+options\b/i,
    result: {
      executor_type: 'agent',
      requires_input: 'decide',
    },
  },
  {
    pattern: /\b(call|meet|negotiate|present|pitch|interview|visit)\b/i,
    result: {
      executor_type: 'human',
      requires_input: 'create',
    },
  },
  {
    pattern: /\b(setup|configure|install|deploy|build|code|fix|test)\b/i,
    result: {
      executor_type: 'agent',
      requires_input: 'verify',
    },
  },
  {
    pattern: /\b(design|create|brainstorm)\b/i,
    result: {
      executor_type: 'ambiguous',
      requires_input: 'verify',
    },
  },
];

const defaultClassification: TaskClassification = {
  executor_type: 'human',
  requires_input: 'no',
};

export function classifyTask(title: string, _description?: string): TaskClassification {
  const normalizedTitle = title.trim();
  if (!normalizedTitle) {
    return defaultClassification;
  }

  for (const rule of classificationRules) {
    if (rule.pattern.test(normalizedTitle)) {
      return rule.result;
    }
  }

  return defaultClassification;
}
