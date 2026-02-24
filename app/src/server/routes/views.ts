import {
  and,
  asc,
  desc,
  eq,
  inArray,
  sql,
  type SQL,
} from 'drizzle-orm';
import { Router } from 'express';

import { db } from '../../db/index';
import {
  agents,
  areas,
  inputQueue,
  keyResults,
  milestones,
  objectives,
  projects,
  tasks,
  users,
} from '../../db/schema';
import { isTaskStatus, type TaskStatus } from '../engine/state-machine';
import { asyncHandler } from './utils';

const viewsRouter = Router();

const boardStatuses: readonly TaskStatus[] = [
  'todo',
  'in_progress',
  'waiting',
  'review',
  'done',
];
const boardStatusSet = new Set<TaskStatus>(boardStatuses);
const validPriorities = new Set([0, 1, 2, 3]);

function parseFilterValue(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === 'all') {
    return null;
  }

  return trimmed;
}

const commandCenterDateFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'long',
  weekday: 'long',
});
const millisecondsPerDay = 1000 * 60 * 60 * 24;
const commandCenterAgentStatusOrder: Record<string, number> = {
  working: 0,
  idle: 1,
};

function toDateKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * millisecondsPerDay);
}

function getGreeting(name: string): string {
  const hour = new Date().getHours();

  if (hour <= 5) {
    return `Working late, ${name}.`;
  }

  if (hour <= 11) {
    return `Good morning, ${name}.`;
  }

  if (hour <= 16) {
    return `Good afternoon, ${name}.`;
  }

  if (hour <= 20) {
    return `Good evening, ${name}.`;
  }

  return `Winding down, ${name}.`;
}

function extractDaysBetween(startDate: string, endDate: string): number {
  const startMs = Date.parse(`${startDate}T00:00:00.000Z`);
  const endMs = Date.parse(`${endDate}T00:00:00.000Z`);

  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
    return 1;
  }

  return Math.ceil((endMs - startMs) / millisecondsPerDay);
}

function getCurrentQuarterLabel(dateValue: Date): string {
  const quarter = Math.floor(dateValue.getMonth() / 3) + 1;
  return `${dateValue.getFullYear()}-Q${quarter}`;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (value <= 0) {
    return 0;
  }

  if (value >= 100) {
    return 100;
  }

  return Math.round(value);
}

interface CommandCenterTaskRow {
  dueDate: string | null;
  executorId: string | null;
  executorType: string;
  id: string;
  priority: number;
  priorityScore: number;
  projectTitle: string | null;
  status: string;
  title: string;
}

interface CommandCenterQueueRow {
  agentId: string | null;
  agentName: string | null;
  createdAt: string;
  id: string;
  queueType: string;
  title: string;
}

interface CommandCenterAgentRow {
  id: string;
  name: string;
  status: string;
}

interface CommandCenterObjectiveRow {
  id: string;
  progress: number;
  quarter: string;
  title: string;
}

interface CommandCenterKeyResultRow {
  currentValue: number;
  id: string;
  objectiveId: string;
  targetValue: number;
  title: string;
}

viewsRouter.get(
  '/board',
  asyncHandler(async (req, res) => {
    const areaFilter = parseFilterValue(req.query.area);
    const projectFilter = parseFilterValue(req.query.project);
    const executorFilter = parseFilterValue(req.query.executor);
    const priorityFilterRaw = parseFilterValue(req.query.priority);
    const parsedPriority =
      priorityFilterRaw && Number.isInteger(Number(priorityFilterRaw))
        ? Number(priorityFilterRaw)
        : null;
    const priorityFilter =
      parsedPriority !== null && validPriorities.has(parsedPriority)
        ? parsedPriority
        : null;

    const taskConditions: SQL<unknown>[] = [
      eq(tasks.userId, req.userId),
      inArray(tasks.status, [...boardStatuses]),
    ];

    if (projectFilter) {
      taskConditions.push(eq(tasks.projectId, projectFilter));
    }
    if (executorFilter) {
      taskConditions.push(eq(tasks.executorType, executorFilter));
    }
    if (priorityFilter !== null) {
      taskConditions.push(eq(tasks.priority, priorityFilter));
    }
    if (areaFilter) {
      taskConditions.push(eq(projects.areaId, areaFilter));
    }

    const boardRows = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        priority: tasks.priority,
        priorityScore: tasks.priorityScore,
        executorType: tasks.executorType,
        dueDate: tasks.dueDate,
        projectTitle: projects.title,
        milestoneTitle: milestones.title,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .leftJoin(
        projects,
        and(eq(projects.id, tasks.projectId), eq(projects.userId, req.userId)),
      )
      .leftJoin(
        milestones,
        and(eq(milestones.id, tasks.milestoneId), eq(milestones.userId, req.userId)),
      )
      .where(and(...taskConditions))
      .orderBy(desc(tasks.priorityScore), asc(tasks.priority), desc(tasks.updatedAt));

    const columns = boardStatuses.map((status) => ({
      key: status,
      cards: [] as Array<{
        id: string;
        title: string;
        status: TaskStatus;
        priority: number;
        priority_score: number;
        executor_type: string;
        due_date: string | null;
        breadcrumb: string;
      }>,
    }));
    const columnByKey = new Map(columns.map((column) => [column.key, column]));

    for (const row of boardRows) {
      if (!isTaskStatus(row.status) || !boardStatusSet.has(row.status)) {
        continue;
      }

      const column = columnByKey.get(row.status);
      if (!column) {
        continue;
      }

      const breadcrumbParts = [row.projectTitle, row.milestoneTitle].filter(Boolean);
      column.cards.push({
        id: row.id,
        title: row.title,
        status: row.status,
        priority: row.priority,
        priority_score: row.priorityScore,
        executor_type: row.executorType,
        due_date: row.dueDate,
        breadcrumb: breadcrumbParts.join(' > '),
      });
    }

    for (const column of columns) {
      column.cards.sort((a, b) => {
        if (b.priority_score !== a.priority_score) {
          return b.priority_score - a.priority_score;
        }

        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }

        return a.title.localeCompare(b.title);
      });
    }

    const scopedAreas = await db
      .select({
        id: areas.id,
        name: areas.name,
      })
      .from(areas)
      .where(eq(areas.userId, req.userId))
      .orderBy(asc(areas.sortOrder), asc(areas.name));

    const projectConditions: SQL<unknown>[] = [eq(projects.userId, req.userId)];
    if (areaFilter) {
      projectConditions.push(eq(projects.areaId, areaFilter));
    }

    const scopedProjects = await db
      .select({
        id: projects.id,
        title: projects.title,
        areaId: projects.areaId,
      })
      .from(projects)
      .where(and(...projectConditions))
      .orderBy(asc(projects.sortOrder), asc(projects.title));

    res.json({
      data: {
        columns: columns.map((column) => ({ ...column, count: column.cards.length })),
        filters: {
          areas: scopedAreas,
          projects: scopedProjects,
          executors: [
            { value: 'human', label: 'Human' },
            { value: 'agent', label: 'Agent' },
            { value: 'ambiguous', label: 'Ambiguous' },
          ],
          priorities: [
            { value: '0', label: 'Critical' },
            { value: '1', label: 'High' },
            { value: '2', label: 'Medium' },
            { value: '3', label: 'Low' },
          ],
        },
      },
    });
  }),
);

viewsRouter.get(
  '/command-center',
  asyncHandler(async (req, res) => {
    const now = new Date();
    const todayKey = toDateKey(now);
    const dueSoonKey = toDateKey(addDays(now, 2));
    const staleInputCutoffIso = addDays(now, -5).toISOString();

    const [
      userRows,
      taskRows,
      queueRows,
      agentRows,
      allActiveObjectives,
      completionRows,
    ] = await Promise.all([
      db
        .select({
          name: users.name,
        })
        .from(users)
        .where(eq(users.id, req.userId))
        .limit(1),
      db
        .select({
          id: tasks.id,
          title: tasks.title,
          status: tasks.status,
          priority: tasks.priority,
          priorityScore: tasks.priorityScore,
          dueDate: tasks.dueDate,
          executorType: tasks.executorType,
          executorId: tasks.executorId,
          projectTitle: projects.title,
        })
        .from(tasks)
        .leftJoin(
          projects,
          and(eq(projects.id, tasks.projectId), eq(projects.userId, req.userId)),
        )
        .where(eq(tasks.userId, req.userId))
        .orderBy(desc(tasks.priorityScore), asc(tasks.priority), asc(tasks.sortOrder), desc(tasks.updatedAt)),
      db
        .select({
          id: inputQueue.id,
          title: inputQueue.title,
          queueType: inputQueue.queueType,
          agentId: inputQueue.agentId,
          agentName: agents.name,
          createdAt: inputQueue.createdAt,
        })
        .from(inputQueue)
        .leftJoin(agents, and(eq(agents.id, inputQueue.agentId), eq(agents.userId, req.userId)))
        .where(and(eq(inputQueue.userId, req.userId), eq(inputQueue.status, 'pending')))
        .orderBy(asc(inputQueue.priority), desc(inputQueue.createdAt)),
      db
        .select({
          id: agents.id,
          name: agents.name,
          status: agents.status,
        })
        .from(agents)
        .where(eq(agents.userId, req.userId))
        .orderBy(desc(agents.updatedAt), asc(agents.name)),
      db
        .select({
          id: objectives.id,
          title: objectives.title,
          quarter: objectives.quarter,
          progress: objectives.progress,
        })
        .from(objectives)
        .where(and(eq(objectives.userId, req.userId), eq(objectives.status, 'active')))
        .orderBy(desc(objectives.updatedAt), asc(objectives.title)),
      db
        .select({
          id: tasks.id,
          title: tasks.title,
          completedAt: tasks.completedAt,
          updatedAt: tasks.updatedAt,
        })
        .from(tasks)
        .where(and(eq(tasks.userId, req.userId), eq(tasks.status, 'done')))
        .orderBy(desc(tasks.completedAt), desc(tasks.updatedAt))
        .limit(5),
    ]);

    const typedTaskRows = taskRows as CommandCenterTaskRow[];
    const typedQueueRows = queueRows as CommandCenterQueueRow[];
    const typedAgentRows = agentRows as CommandCenterAgentRow[];
    const typedObjectives = allActiveObjectives as CommandCenterObjectiveRow[];

    const activeTasks = typedTaskRows.filter((task) => task.status !== 'done');

    const topPriorities = [...activeTasks]
      .sort((left, right) => {
        if (right.priorityScore !== left.priorityScore) {
          return right.priorityScore - left.priorityScore;
        }

        if (left.priority !== right.priority) {
          return left.priority - right.priority;
        }

        return left.title.localeCompare(right.title);
      })
      .slice(0, 3)
      .map((task) => ({
        id: task.id,
        title: task.title,
        priority: task.priority,
        priorityScore: task.priorityScore,
        dueDate: task.dueDate,
        project: task.projectTitle,
      }));

    const inboxBreakdownMap = new Map<string, number>();
    for (const item of typedQueueRows) {
      const current = inboxBreakdownMap.get(item.queueType) ?? 0;
      inboxBreakdownMap.set(item.queueType, current + 1);
    }

    const inboxBadge = {
      pendingCount: typedQueueRows.length,
      breakdown: [...inboxBreakdownMap.entries()]
        .map(([type, count]) => ({ type, count }))
        .sort((left, right) => right.count - left.count),
    };

    const blockersById = new Map<
      string,
      { dueDate: string | null; id: string; reason: string; title: string }
    >();

    for (const task of activeTasks) {
      if (task.status === 'waiting') {
        blockersById.set(task.id, {
          id: task.id,
          title: task.title,
          dueDate: task.dueDate,
          reason: 'Waiting for dependency or review',
        });
      }

      if (task.dueDate && task.dueDate < todayKey) {
        const overdueDays = extractDaysBetween(task.dueDate, todayKey);
        const overdueReason = `${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue`;
        const existing = blockersById.get(task.id);

        blockersById.set(task.id, {
          id: task.id,
          title: task.title,
          dueDate: task.dueDate,
          reason: existing ? `${existing.reason} | ${overdueReason}` : overdueReason,
        });
      } else if (task.dueDate && task.dueDate <= dueSoonKey) {
        const existing = blockersById.get(task.id);
        const dueSoonReason = 'Due within 48 hours';

        blockersById.set(task.id, {
          id: task.id,
          title: task.title,
          dueDate: task.dueDate,
          reason: existing ? `${existing.reason} | ${dueSoonReason}` : dueSoonReason,
        });
      }
    }

    for (const queueItem of typedQueueRows) {
      if (queueItem.createdAt >= staleInputCutoffIso) {
        continue;
      }

      blockersById.set(`input-${queueItem.id}`, {
        id: `input-${queueItem.id}`,
        title: queueItem.title,
        dueDate: null,
        reason: 'Input queue item pending for more than 5 days',
      });
    }

    const blockers = [...blockersById.values()].slice(0, 8);

    const inProgressTaskByAgentId = new Map<string, string>();
    for (const task of activeTasks) {
      if (
        task.executorType === 'agent' &&
        task.status === 'in_progress' &&
        task.executorId &&
        !inProgressTaskByAgentId.has(task.executorId)
      ) {
        inProgressTaskByAgentId.set(task.executorId, task.title);
      }
    }

    const queueTaskByAgentId = new Map<string, string>();
    for (const item of typedQueueRows) {
      if (item.agentId && !queueTaskByAgentId.has(item.agentId)) {
        queueTaskByAgentId.set(item.agentId, item.title);
      }
    }

    const activeAgents = [...typedAgentRows]
      .sort((left, right) => {
        const leftWeight = commandCenterAgentStatusOrder[left.status] ?? 2;
        const rightWeight = commandCenterAgentStatusOrder[right.status] ?? 2;

        if (leftWeight !== rightWeight) {
          return leftWeight - rightWeight;
        }

        return left.name.localeCompare(right.name);
      })
      .slice(0, 5)
      .map((agent) => {
        const queueTask = queueTaskByAgentId.get(agent.id) ?? null;
        const currentTask = inProgressTaskByAgentId.get(agent.id) ?? queueTask;
        const status =
          agent.status === 'working'
            ? 'working'
            : queueTask
              ? 'waiting'
              : agent.status === 'idle'
                ? 'idle'
                : 'waiting';

        return {
          id: agent.id,
          name: agent.name,
          status,
          currentTask,
        };
      });

    if (activeAgents.length === 0 && typedQueueRows.length > 0) {
      const fallbackAgents = new Map<string, { id: string; name: string; currentTask: string | null }>();

      for (const item of typedQueueRows) {
        const fallbackKey = item.agentName?.trim() || 'assistant-agent';
        if (fallbackAgents.has(fallbackKey)) {
          continue;
        }

        fallbackAgents.set(fallbackKey, {
          id: fallbackKey,
          name: fallbackKey,
          currentTask: item.title,
        });
      }

      activeAgents.push(
        ...[...fallbackAgents.values()].slice(0, 5).map((agent) => ({
          ...agent,
          status: 'waiting' as const,
        })),
      );
    }

    const currentQuarter = getCurrentQuarterLabel(now);
    const currentQuarterObjectives = typedObjectives.filter(
      (objective) => objective.quarter === currentQuarter,
    );
    const selectedObjectives =
      currentQuarterObjectives.length > 0
        ? currentQuarterObjectives.slice(0, 4)
        : typedObjectives.slice(0, 4);

    const selectedObjectiveIds = selectedObjectives.map((objective) => objective.id);
    let selectedKeyResults: CommandCenterKeyResultRow[] = [];

    if (selectedObjectiveIds.length > 0) {
      const keyResultRows = await db
        .select({
          id: keyResults.id,
          objectiveId: keyResults.objectiveId,
          title: keyResults.title,
          currentValue: keyResults.currentValue,
          targetValue: keyResults.targetValue,
        })
        .from(keyResults)
        .where(and(eq(keyResults.userId, req.userId), inArray(keyResults.objectiveId, selectedObjectiveIds)))
        .orderBy(asc(keyResults.sortOrder), asc(keyResults.createdAt));

      selectedKeyResults = keyResultRows as CommandCenterKeyResultRow[];
    }

    const keyResultsByObjectiveId = new Map<
      string,
      Array<{ current: number; id: string; label: string; progress: number; target: number }>
    >();

    for (const keyResult of selectedKeyResults) {
      const progress =
        keyResult.targetValue > 0
          ? clampPercent((keyResult.currentValue / keyResult.targetValue) * 100)
          : 0;

      const currentResults = keyResultsByObjectiveId.get(keyResult.objectiveId) ?? [];
      currentResults.push({
        id: keyResult.id,
        label: keyResult.title,
        current: keyResult.currentValue,
        target: keyResult.targetValue,
        progress,
      });
      keyResultsByObjectiveId.set(keyResult.objectiveId, currentResults);
    }

    const keyResultProgress = selectedObjectives.map((objective) => {
      const objectiveKeyResults = keyResultsByObjectiveId.get(objective.id) ?? [];
      const derivedProgress =
        objectiveKeyResults.length > 0
          ? clampPercent(
              objectiveKeyResults.reduce((total, item) => total + item.progress, 0) /
                objectiveKeyResults.length,
            )
          : clampPercent(objective.progress);

      return {
        id: objective.id,
        title: objective.title,
        progress: derivedProgress,
        keyResults: objectiveKeyResults,
      };
    });

    const recentCompletions = completionRows.map((row) => ({
      id: row.id,
      title: row.title,
      completedAt: row.completedAt ?? row.updatedAt ?? null,
    }));

    const tasksToday = activeTasks.filter((task) => task.dueDate === todayKey).length;
    const displayName = userRows[0]?.name?.trim() || 'there';
    const todayHeader = {
      greeting: getGreeting(displayName),
      dateLabel: commandCenterDateFormatter.format(now),
      tasksToday,
      needAttention: blockers.length + inboxBadge.pendingCount,
    };

    const hasData =
      typedTaskRows.length > 0 ||
      typedQueueRows.length > 0 ||
      typedAgentRows.length > 0 ||
      selectedObjectives.length > 0 ||
      recentCompletions.length > 0;

    res.json({
      data: {
        hasData,
        todayHeader,
        topPriorities,
        inboxBadge,
        activeAgents,
        keyResultProgress,
        recentCompletions,
        blockers,
      },
    });
  }),
);

export { viewsRouter };
