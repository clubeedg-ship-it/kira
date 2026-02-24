import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../db/index';
import { dependencies, tasks } from '../../db/schema';
const explicitPriorityScoreByPriority = {
    0: 10,
    1: 7,
    2: 4,
    3: 1,
};
const activeTaskStatuses = ['todo', 'in_progress', 'waiting', 'review'];
const millisecondsPerDay = 24 * 60 * 60 * 1000;
function parseDateOnly(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return null;
    }
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    return parsed;
}
function getDeadlineUrgency(dueDate) {
    if (!dueDate) {
        return 1;
    }
    const due = parseDateOnly(dueDate);
    if (!due) {
        return 1;
    }
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const dayDifference = Math.floor((due.getTime() - today.getTime()) / millisecondsPerDay);
    if (dayDifference < 0) {
        return 10;
    }
    if (dayDifference === 0) {
        return 8;
    }
    if (dayDifference <= 7) {
        return 5;
    }
    if (due.getUTCFullYear() === today.getUTCFullYear() &&
        due.getUTCMonth() === today.getUTCMonth()) {
        return 3;
    }
    return 1;
}
function getExplicitPriorityScore(priority) {
    if (priority === null || priority === undefined) {
        return explicitPriorityScoreByPriority[2];
    }
    return explicitPriorityScoreByPriority[priority] ?? explicitPriorityScoreByPriority[2];
}
export function calculatePriority(task, blockingCount) {
    const dueDate = task.dueDate ?? task.due_date ?? null;
    const deadlineUrgency = getDeadlineUrgency(dueDate);
    const explicitPriorityScore = getExplicitPriorityScore(task.priority);
    const normalizedBlockingCount = Number.isFinite(blockingCount)
        ? Math.max(0, Math.trunc(blockingCount))
        : 0;
    return deadlineUrgency * 3 + normalizedBlockingCount * 2 + explicitPriorityScore;
}
export async function recalculatePriorities(userId) {
    const activeTasks = await db
        .select({
        id: tasks.id,
        dueDate: tasks.dueDate,
        priority: tasks.priority,
    })
        .from(tasks)
        .where(and(eq(tasks.userId, userId), inArray(tasks.status, [...activeTaskStatuses])));
    if (activeTasks.length === 0) {
        return;
    }
    const activeTaskIds = activeTasks.map((task) => task.id);
    const blockingRows = await db
        .select({
        blockerId: dependencies.blockerId,
        count: sql `count(*)::int`,
    })
        .from(dependencies)
        .where(and(eq(dependencies.userId, userId), eq(dependencies.blockerType, 'task'), eq(dependencies.blockedType, 'task'), inArray(dependencies.blockerId, activeTaskIds)))
        .groupBy(dependencies.blockerId);
    const blockingCountByTaskId = new Map();
    for (const row of blockingRows) {
        blockingCountByTaskId.set(row.blockerId, row.count);
    }
    await Promise.all(activeTasks.map((task) => db
        .update(tasks)
        .set({
        priorityScore: calculatePriority(task, blockingCountByTaskId.get(task.id) ?? 0),
    })
        .where(and(eq(tasks.userId, userId), eq(tasks.id, task.id)))));
}
//# sourceMappingURL=priority.js.map