import { and, asc, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';

import { db } from '../../db/index';
import { agents, dependencies, projects, tasks } from '../../db/schema';
import { AGENT_WORK_QUEUE_NAME, agentWorkQueue, buildAgentWorkJobId } from '../jobs/queue';

type TaskCapability = 'research' | 'write' | 'code' | 'planning';

interface TaskCandidate {
  id: string;
  title: string;
  description: string | null;
  executorType: string;
  executorId: string | null;
  status: string;
  priority: number;
  priorityScore: number;
  projectId: string | null;
  areaId: string | null;
}

interface AgentCandidate {
  id: string;
  name: string;
  status: string;
  maxConcurrent: number;
  canExecute: unknown;
  areaIds: unknown;
}

interface PreparedAgent {
  id: string;
  name: string;
  status: string;
  maxConcurrent: number;
  activeCount: number;
  availableSlots: number;
  capabilitySet: Set<TaskCapability>;
  areaIdSet: Set<string>;
}

export interface AgentMatch {
  id: string;
  name: string;
  score: number;
  status: string;
  maxConcurrent: number;
  activeCount: number;
}

export interface EnqueuedAgentTask {
  jobId: string;
  taskId: string;
  agentId: string;
}

type OrchestratorErrorCode = 'NOT_FOUND' | 'VALIDATION_ERROR' | 'CAPACITY_REACHED';

export class OrchestratorError extends Error {
  readonly code: OrchestratorErrorCode;

  constructor(code: OrchestratorErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean);
}

function normalizeCapability(value: string): TaskCapability | null {
  const token = value.trim().toLowerCase();
  if (!token) {
    return null;
  }

  if (/\b(research|analy|compare|investigat|find|summar|scout)\b/.test(token)) {
    return 'research';
  }

  if (/\b(write|draft|email|message|reply|respond|edit|comms?)\b/.test(token)) {
    return 'write';
  }

  if (/\b(code|build|fix|deploy|test|ship|refactor|implement|automation)\b/.test(token)) {
    return 'code';
  }

  if (/\b(route|plan|review|orchestrator)\b/.test(token)) {
    return 'planning';
  }

  return null;
}

function inferTaskCapabilities(task: Pick<TaskCandidate, 'title' | 'description'>): TaskCapability[] {
  const source = `${task.title} ${task.description ?? ''}`.toLowerCase();
  const inferred = new Set<TaskCapability>();

  if (/\b(research|compare|analy|find|investigat|scout)\b/.test(source)) {
    inferred.add('research');
  }

  if (/\b(draft|write|email|reply|message|schedule)\b/.test(source)) {
    inferred.add('write');
  }

  if (/\b(build|fix|configure|deploy|test|code|implement)\b/.test(source)) {
    inferred.add('code');
  }

  if (/\b(plan|review|route)\b/.test(source)) {
    inferred.add('planning');
  }

  return [...inferred];
}

function prepareAgents(rows: AgentCandidate[], activeCountByAgentId: Map<string, number>): PreparedAgent[] {
  return rows
    .filter((row) => row.status !== 'paused')
    .map((row) => {
      const activeCount = activeCountByAgentId.get(row.id) ?? 0;
      const availableSlots = Math.max(0, row.maxConcurrent - activeCount);
      const capabilities = parseStringArray(row.canExecute)
        .map(normalizeCapability)
        .filter((capability): capability is TaskCapability => capability !== null);

      return {
        id: row.id,
        name: row.name,
        status: row.status,
        maxConcurrent: row.maxConcurrent,
        activeCount,
        availableSlots,
        capabilitySet: new Set(capabilities),
        areaIdSet: new Set(parseStringArray(row.areaIds)),
      };
    });
}

function scoreAgentForTask(task: TaskCandidate, agent: PreparedAgent): number | null {
  if (agent.availableSlots <= 0) {
    return null;
  }

  if (task.executorId && task.executorId !== agent.id) {
    return null;
  }

  if (task.areaId && agent.areaIdSet.size > 0 && !agent.areaIdSet.has(task.areaId)) {
    return null;
  }

  const requiredCapabilities = inferTaskCapabilities(task);
  const overlapCount =
    requiredCapabilities.length === 0
      ? 0
      : requiredCapabilities.filter((capability) => agent.capabilitySet.has(capability)).length;

  if (
    requiredCapabilities.length > 0 &&
    agent.capabilitySet.size > 0 &&
    overlapCount === 0
  ) {
    return null;
  }

  let score = 0;

  if (task.executorId === agent.id) {
    score += 100;
  }

  if (requiredCapabilities.length === 0) {
    score += 10;
  } else if (agent.capabilitySet.size === 0) {
    score += 8;
  } else {
    score += overlapCount * 30;
  }

  if (!task.areaId || agent.areaIdSet.size === 0) {
    score += 6;
  } else if (agent.areaIdSet.has(task.areaId)) {
    score += 14;
  }

  if (agent.status === 'idle') {
    score += 10;
  }

  score += Math.min(3, agent.availableSlots) * 2;
  score -= agent.activeCount * 4;

  return score;
}

function getBestAgentForTask(task: TaskCandidate, preparedAgents: PreparedAgent[]): AgentMatch | null {
  let bestMatch: AgentMatch | null = null;

  for (const agent of preparedAgents) {
    const score = scoreAgentForTask(task, agent);
    if (score === null) {
      continue;
    }

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = {
        id: agent.id,
        name: agent.name,
        score,
        status: agent.status,
        maxConcurrent: agent.maxConcurrent,
        activeCount: agent.activeCount,
      };
    }
  }

  return bestMatch;
}

async function getActiveTaskCountByAgent(userId: string): Promise<Map<string, number>> {
  const rows = await db
    .select({
      executorId: tasks.executorId,
      count: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.executorType, 'agent'),
        eq(tasks.status, 'in_progress'),
        isNotNull(tasks.executorId),
      ),
    )
    .groupBy(tasks.executorId);

  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.executorId) {
      continue;
    }
    counts.set(row.executorId, row.count);
  }

  return counts;
}

async function listAgents(userId: string, onlyIdle = false): Promise<AgentCandidate[]> {
  const conditions = [eq(agents.userId, userId)];
  if (onlyIdle) {
    conditions.push(eq(agents.status, 'idle'));
  }

  return db
    .select({
      id: agents.id,
      name: agents.name,
      status: agents.status,
      maxConcurrent: agents.maxConcurrent,
      canExecute: agents.canExecute,
      areaIds: agents.areaIds,
    })
    .from(agents)
    .where(and(...conditions))
    .orderBy(asc(agents.createdAt));
}

async function listAssignableTasks(userId: string): Promise<TaskCandidate[]> {
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      executorType: tasks.executorType,
      executorId: tasks.executorId,
      status: tasks.status,
      priority: tasks.priority,
      priorityScore: tasks.priorityScore,
      projectId: tasks.projectId,
      areaId: projects.areaId,
    })
    .from(tasks)
    .leftJoin(
      projects,
      and(eq(projects.id, tasks.projectId), eq(projects.userId, userId)),
    )
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.executorType, 'agent'),
        eq(tasks.status, 'todo'),
      ),
    )
    .orderBy(desc(tasks.priorityScore), asc(tasks.priority), asc(tasks.createdAt));
}

async function getTaskCandidateById(userId: string, taskId: string): Promise<TaskCandidate | null> {
  const [row] = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      executorType: tasks.executorType,
      executorId: tasks.executorId,
      status: tasks.status,
      priority: tasks.priority,
      priorityScore: tasks.priorityScore,
      projectId: tasks.projectId,
      areaId: projects.areaId,
    })
    .from(tasks)
    .leftJoin(
      projects,
      and(eq(projects.id, tasks.projectId), eq(projects.userId, userId)),
    )
    .where(and(eq(tasks.userId, userId), eq(tasks.id, taskId)))
    .limit(1);

  return row ?? null;
}

async function filterUnblockedTasks(
  userId: string,
  candidateTasks: TaskCandidate[],
): Promise<TaskCandidate[]> {
  if (candidateTasks.length === 0) {
    return [];
  }

  const candidateTaskIds = candidateTasks.map((task) => task.id);
  const dependencyRows = await db
    .select({
      blockedId: dependencies.blockedId,
      blockerId: dependencies.blockerId,
    })
    .from(dependencies)
    .where(
      and(
        eq(dependencies.userId, userId),
        eq(dependencies.blockerType, 'task'),
        eq(dependencies.blockedType, 'task'),
        inArray(dependencies.blockedId, candidateTaskIds),
      ),
    );

  if (dependencyRows.length === 0) {
    return candidateTasks;
  }

  const blockerIds = [...new Set(dependencyRows.map((row) => row.blockerId))];
  const blockerRows = await db
    .select({
      id: tasks.id,
      status: tasks.status,
    })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), inArray(tasks.id, blockerIds)));

  const blockerStatusById = new Map(blockerRows.map((row) => [row.id, row.status]));
  const blockedTaskIds = new Set<string>();

  for (const row of dependencyRows) {
    if (blockerStatusById.get(row.blockerId) !== 'done') {
      blockedTaskIds.add(row.blockedId);
    }
  }

  return candidateTasks.filter((task) => !blockedTaskIds.has(task.id));
}

async function enqueueAgentWorkTask(data: {
  userId: string;
  taskId: string;
  agentId: string;
}): Promise<EnqueuedAgentTask> {
  const jobId = buildAgentWorkJobId(data.userId, data.taskId);
  const existingJob = await agentWorkQueue.getJob(jobId);

  if (existingJob) {
    const existingState = await existingJob.getState();
    if (existingState === 'failed' || existingState === 'completed') {
      await existingJob.remove();
    } else {
      return {
        jobId: String(existingJob.id ?? jobId),
        taskId: data.taskId,
        agentId: data.agentId,
      };
    }
  }

  const queuedJob = await agentWorkQueue.add(AGENT_WORK_QUEUE_NAME, data, {
    jobId,
  });

  return {
    jobId: String(queuedJob.id ?? jobId),
    taskId: data.taskId,
    agentId: data.agentId,
  };
}

export async function getAgentForTask(userId: string, taskId: string): Promise<AgentMatch | null> {
  const task = await getTaskCandidateById(userId, taskId);
  if (!task || task.executorType !== 'agent') {
    return null;
  }

  const [activeCountByAgentId, agentRows] = await Promise.all([
    getActiveTaskCountByAgent(userId),
    listAgents(userId, false),
  ]);
  const preparedAgents = prepareAgents(agentRows, activeCountByAgentId);

  return getBestAgentForTask(task, preparedAgents);
}

export async function assignAvailableTasks(userId: string): Promise<EnqueuedAgentTask[]> {
  const [activeCountByAgentId, idleAgentRows, assignableTasks] = await Promise.all([
    getActiveTaskCountByAgent(userId),
    listAgents(userId, true),
    listAssignableTasks(userId),
  ]);

  if (idleAgentRows.length === 0 || assignableTasks.length === 0) {
    return [];
  }

  const preparedAgents = prepareAgents(idleAgentRows, activeCountByAgentId);
  const unblockedTasks = await filterUnblockedTasks(userId, assignableTasks);
  const enqueued: EnqueuedAgentTask[] = [];

  for (const task of unblockedTasks) {
    const bestAgent = getBestAgentForTask(task, preparedAgents);
    if (!bestAgent) {
      continue;
    }

    const mutableAgent = preparedAgents.find((agent) => agent.id === bestAgent.id);
    if (!mutableAgent || mutableAgent.availableSlots <= 0) {
      continue;
    }

    if (task.executorId !== bestAgent.id) {
      await db
        .update(tasks)
        .set({
          executorId: bestAgent.id,
          updatedAt: sql`now()`,
        })
        .where(and(eq(tasks.userId, userId), eq(tasks.id, task.id)));
    }

    const queuedJob = await enqueueAgentWorkTask({
      userId,
      taskId: task.id,
      agentId: bestAgent.id,
    });
    enqueued.push(queuedJob);
    mutableAgent.availableSlots -= 1;
  }

  return enqueued;
}

export async function enqueueAgentTask(
  userId: string,
  agentId: string,
  taskId: string,
): Promise<EnqueuedAgentTask> {
  const [task, activeCountByAgentId, [agentRow]] = await Promise.all([
    getTaskCandidateById(userId, taskId),
    getActiveTaskCountByAgent(userId),
    db
      .select({
        id: agents.id,
        name: agents.name,
        status: agents.status,
        maxConcurrent: agents.maxConcurrent,
        canExecute: agents.canExecute,
        areaIds: agents.areaIds,
      })
      .from(agents)
      .where(and(eq(agents.userId, userId), eq(agents.id, agentId)))
      .limit(1),
  ]);

  if (!task || task.executorType !== 'agent') {
    throw new OrchestratorError('NOT_FOUND', 'Task not found');
  }

  if (!agentRow) {
    throw new OrchestratorError('NOT_FOUND', 'Agent not found');
  }

  if (task.status !== 'todo') {
    throw new OrchestratorError('VALIDATION_ERROR', 'Task must be in todo status to run');
  }

  const [unblockedTask] = await filterUnblockedTasks(userId, [task]);
  if (!unblockedTask) {
    throw new OrchestratorError(
      'VALIDATION_ERROR',
      'Task is blocked by unresolved dependencies',
    );
  }

  const [preparedAgent] = prepareAgents([agentRow], activeCountByAgentId);
  if (!preparedAgent) {
    throw new OrchestratorError('NOT_FOUND', 'Agent not found');
  }

  if (preparedAgent.status === 'paused') {
    throw new OrchestratorError('VALIDATION_ERROR', 'Agent is paused');
  }

  if (preparedAgent.availableSlots <= 0) {
    throw new OrchestratorError(
      'CAPACITY_REACHED',
      'Agent has reached max_concurrent capacity',
    );
  }

  const score = scoreAgentForTask(task, preparedAgent);
  if (score === null) {
    throw new OrchestratorError(
      'VALIDATION_ERROR',
      'Task does not match the selected agent capabilities or area assignments',
    );
  }

  if (task.executorId !== agentId) {
    await db
      .update(tasks)
      .set({
        executorId: agentId,
        updatedAt: sql`now()`,
      })
      .where(and(eq(tasks.userId, userId), eq(tasks.id, taskId)));
  }

  return enqueueAgentWorkTask({
    userId,
    taskId,
    agentId,
  });
}
