import { and, asc, desc, eq, gte, inArray, lt, lte, ne, or, sql, } from 'drizzle-orm';
import { db } from '../../db/index';
import { agents, dependencies, inputQueue, keyResults, reviews, tasks, } from '../../db/schema';
import { emitEvent } from '../events/sse';
function toDateOnly(value) {
    return value.toISOString().slice(0, 10);
}
function startOfDayUtc(value) {
    const next = new Date(value);
    next.setUTCHours(0, 0, 0, 0);
    return next;
}
function addDays(value, days) {
    const next = new Date(value);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
}
function summarizeTitles(titles) {
    if (titles.length === 0) {
        return 'None';
    }
    return titles.join(', ');
}
function clampPercent(value) {
    if (!Number.isFinite(value)) {
        return 0;
    }
    return Math.max(0, Math.min(100, value));
}
function emitNotification(userId, title, body, priority, actionUrl) {
    emitEvent(userId, 'system', 'system.notification', {
        title,
        body,
        priority,
        action_url: actionUrl,
    });
}
function resolveFullCheckPhase(now, hint) {
    if (hint !== 'auto') {
        return hint;
    }
    if (now.getHours() >= 18) {
        return 'evening';
    }
    return 'morning';
}
async function upsertDailyReview(input) {
    const scheduledAt = new Date(input.scheduledAt);
    const dayStart = startOfDayUtc(scheduledAt);
    const nextDay = addDays(dayStart, 1);
    const [existing] = await db
        .select({ id: reviews.id })
        .from(reviews)
        .where(and(eq(reviews.userId, input.userId), eq(reviews.reviewType, input.reviewType), gte(reviews.scheduled, dayStart.toISOString()), lt(reviews.scheduled, nextDay.toISOString())))
        .orderBy(desc(reviews.scheduled))
        .limit(1);
    if (existing) {
        const [updated] = await db
            .update(reviews)
            .set({
            insights: input.insights,
            status: 'completed',
            scheduled: input.scheduledAt,
            completedAt: new Date().toISOString(),
        })
            .where(and(eq(reviews.userId, input.userId), eq(reviews.id, existing.id)))
            .returning({ id: reviews.id });
        return updated?.id ?? existing.id;
    }
    const [created] = await db
        .insert(reviews)
        .values({
        userId: input.userId,
        reviewType: input.reviewType,
        scheduled: input.scheduledAt,
        status: 'completed',
        insights: input.insights,
        completedAt: new Date().toISOString(),
    })
        .returning({ id: reviews.id });
    if (!created) {
        throw new Error('Unable to persist daily review.');
    }
    return created.id;
}
async function checkStaleInputQueue(userId, now) {
    const staleThresholdIso = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
    const [countRow] = await db
        .select({ count: sql `count(*)::int` })
        .from(inputQueue)
        .where(and(eq(inputQueue.userId, userId), eq(inputQueue.status, 'pending'), lt(inputQueue.createdAt, staleThresholdIso)));
    const staleCount = Number(countRow?.count ?? 0);
    if (staleCount > 0) {
        emitNotification(userId, 'Stale inbox items', `${staleCount} input queue item(s) have been pending for more than 48 hours.`, 1, '/inbox');
    }
    return staleCount;
}
async function unblockResolvedDependencies(userId) {
    const waitingRows = await db
        .select({
        id: tasks.id,
        title: tasks.title,
    })
        .from(tasks)
        .where(and(eq(tasks.userId, userId), eq(tasks.status, 'waiting')))
        .orderBy(asc(tasks.createdAt));
    if (waitingRows.length === 0) {
        return 0;
    }
    let unblockedCount = 0;
    for (const waitingTask of waitingRows) {
        // FIX-006: explicit user_id filter on both tasks JOIN and dependencies WHERE prevents cross-tenant leak
        const blockerRows = await db
            .select({
            blockerId: dependencies.blockerId,
            blockerStatus: tasks.status,
        })
            .from(dependencies)
            .innerJoin(tasks, and(eq(tasks.id, dependencies.blockerId), eq(tasks.userId, userId)))
            .where(and(eq(dependencies.userId, userId), eq(dependencies.blockerType, 'task'), eq(dependencies.blockedType, 'task'), eq(dependencies.blockedId, waitingTask.id)));
        if (blockerRows.length === 0) {
            continue;
        }
        const allResolved = blockerRows.every((row) => row.blockerStatus === 'done');
        if (!allResolved) {
            continue;
        }
        const [updated] = await db
            .update(tasks)
            .set({
            status: 'todo',
            updatedAt: sql `now()`,
        })
            .where(and(eq(tasks.userId, userId), eq(tasks.id, waitingTask.id), eq(tasks.status, 'waiting')))
            .returning({ id: tasks.id });
        if (!updated) {
            continue;
        }
        unblockedCount += 1;
        emitEvent(userId, 'task', 'task.status_changed', {
            id: waitingTask.id,
            task_id: waitingTask.id,
            old_status: 'waiting',
            new_status: 'todo',
            status: 'todo',
        });
        emitEvent(userId, 'dependency', 'dependency.unblocked', {
            task_id: waitingTask.id,
            task_title: waitingTask.title,
            blocker_count: blockerRows.length,
        });
    }
    return unblockedCount;
}
async function checkDeadlineWarnings(userId, today, tomorrow) {
    const [dueTodayRow, dueTomorrowRow] = await Promise.all([
        db
            .select({ count: sql `count(*)::int` })
            .from(tasks)
            .where(and(eq(tasks.userId, userId), eq(tasks.dueDate, today), ne(tasks.status, 'done'), ne(tasks.status, 'cancelled')))
            .then((rows) => rows[0]),
        db
            .select({ count: sql `count(*)::int` })
            .from(tasks)
            .where(and(eq(tasks.userId, userId), eq(tasks.dueDate, tomorrow), ne(tasks.status, 'done'), ne(tasks.status, 'cancelled')))
            .then((rows) => rows[0]),
    ]);
    const dueTodayWarnings = Number(dueTodayRow?.count ?? 0);
    const dueTomorrowWarnings = Number(dueTomorrowRow?.count ?? 0);
    if (dueTodayWarnings > 0) {
        emitNotification(userId, 'Tasks due today', `${dueTodayWarnings} task(s) are due today.`, 1, '/today');
    }
    if (dueTomorrowWarnings > 0) {
        emitNotification(userId, 'Tasks due tomorrow', `${dueTomorrowWarnings} task(s) are due tomorrow.`, 2, '/today');
    }
    return {
        dueTodayWarnings,
        dueTomorrowWarnings,
    };
}
async function checkAgentStuck(userId, now) {
    const staleThresholdIso = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
    const stuckAgents = await db
        .select({
        id: agents.id,
        name: agents.name,
        updatedAt: agents.updatedAt,
    })
        .from(agents)
        .where(and(eq(agents.userId, userId), eq(agents.status, 'working'), lt(agents.updatedAt, staleThresholdIso)))
        .orderBy(asc(agents.updatedAt));
    for (const stuckAgent of stuckAgents) {
        console.warn(`[heartbeat] user=${userId} agent=${stuckAgent.id} "${stuckAgent.name}" may be stuck (working since ${stuckAgent.updatedAt}).`);
    }
    return stuckAgents.length;
}
async function checkOverdueTasks(userId, today) {
    const [overdueRow] = await db
        .select({ count: sql `count(*)::int` })
        .from(tasks)
        .where(and(eq(tasks.userId, userId), lt(tasks.dueDate, today), ne(tasks.status, 'done'), ne(tasks.status, 'cancelled')));
    const overdueTasks = Number(overdueRow?.count ?? 0);
    if (overdueTasks > 0) {
        emitNotification(userId, 'Overdue tasks', `${overdueTasks} task(s) are overdue and still not complete.`, 0, '/today');
    }
    return overdueTasks;
}
async function runQuickChecks(userId, now) {
    const today = toDateOnly(now);
    const tomorrow = toDateOnly(addDays(startOfDayUtc(now), 1));
    const [staleInputItems, unblockedTasks, warnings, stuckAgents, overdueTasks] = await Promise.all([
        checkStaleInputQueue(userId, now),
        unblockResolvedDependencies(userId),
        checkDeadlineWarnings(userId, today, tomorrow),
        checkAgentStuck(userId, now),
        checkOverdueTasks(userId, today),
    ]);
    return {
        staleInputItems,
        unblockedTasks,
        dueTodayWarnings: warnings.dueTodayWarnings,
        dueTomorrowWarnings: warnings.dueTomorrowWarnings,
        stuckAgents,
        overdueTasks,
    };
}
async function runMorningBrief(userId, now) {
    const todayStart = startOfDayUtc(now);
    const yesterdayStart = addDays(todayStart, -1);
    const tomorrowStart = addDays(todayStart, 1);
    const todayDate = toDateOnly(now);
    const [completedYesterdayCountRow, todayTaskCountRow, pendingInputCountRow, overdueCountRow, keyResultRows, completedYesterdayRows, todayTaskRows,] = await Promise.all([
        db
            .select({ count: sql `count(*)::int` })
            .from(tasks)
            .where(and(eq(tasks.userId, userId), gte(tasks.completedAt, yesterdayStart.toISOString()), lt(tasks.completedAt, todayStart.toISOString())))
            .then((rows) => rows[0]),
        db
            .select({ count: sql `count(*)::int` })
            .from(tasks)
            .where(and(eq(tasks.userId, userId), or(eq(tasks.scheduledDate, todayDate), eq(tasks.dueDate, todayDate)), ne(tasks.status, 'done'), ne(tasks.status, 'cancelled')))
            .then((rows) => rows[0]),
        db
            .select({ count: sql `count(*)::int` })
            .from(inputQueue)
            .where(and(eq(inputQueue.userId, userId), eq(inputQueue.status, 'pending')))
            .then((rows) => rows[0]),
        db
            .select({ count: sql `count(*)::int` })
            .from(tasks)
            .where(and(eq(tasks.userId, userId), lt(tasks.dueDate, todayDate), ne(tasks.status, 'done'), ne(tasks.status, 'cancelled')))
            .then((rows) => rows[0]),
        db
            .select({
            currentValue: keyResults.currentValue,
            targetValue: keyResults.targetValue,
        })
            .from(keyResults)
            .where(eq(keyResults.userId, userId)),
        db
            .select({
            title: tasks.title,
        })
            .from(tasks)
            .where(and(eq(tasks.userId, userId), gte(tasks.completedAt, yesterdayStart.toISOString()), lt(tasks.completedAt, todayStart.toISOString())))
            .orderBy(desc(tasks.completedAt))
            .limit(5),
        db
            .select({
            title: tasks.title,
        })
            .from(tasks)
            .where(and(eq(tasks.userId, userId), or(eq(tasks.scheduledDate, todayDate), eq(tasks.dueDate, todayDate)), ne(tasks.status, 'done'), ne(tasks.status, 'cancelled')))
            .orderBy(desc(tasks.priorityScore), asc(tasks.priority), asc(tasks.createdAt))
            .limit(5),
    ]);
    const krProgress = keyResultRows.length === 0
        ? 0
        : Math.round(keyResultRows.reduce((total, row) => {
            if (row.targetValue <= 0) {
                return total;
            }
            return total + clampPercent((row.currentValue / row.targetValue) * 100);
        }, 0) / keyResultRows.length);
    const completedYesterdayCount = Number(completedYesterdayCountRow?.count ?? 0);
    const todayTaskCount = Number(todayTaskCountRow?.count ?? 0);
    const pendingInputCount = Number(pendingInputCountRow?.count ?? 0);
    const overdueCount = Number(overdueCountRow?.count ?? 0);
    const insights = [
        `Morning brief for ${todayDate}`,
        '',
        `Yesterday completed: ${completedYesterdayCount}`,
        `Yesterday highlights: ${summarizeTitles(completedYesterdayRows.map((row) => row.title))}`,
        '',
        `Today tasks (due/scheduled): ${todayTaskCount}`,
        `Top priorities: ${summarizeTitles(todayTaskRows.map((row) => row.title))}`,
        `Pending input queue items: ${pendingInputCount}`,
        `Overdue tasks: ${overdueCount}`,
        `Average KR progress: ${krProgress}%`,
    ].join('\n');
    const reviewId = await upsertDailyReview({
        userId,
        reviewType: 'daily_startup',
        scheduledAt: now.toISOString(),
        insights,
    });
    emitEvent(userId, 'system', 'system.brief_generated', {
        review_id: reviewId,
        review_type: 'daily_startup',
    });
    emitEvent(userId, 'system', 'system.review_due', {
        review_type: 'daily_startup',
    });
    return {
        phase: 'morning',
        reviewId,
        rescheduledTasks: 0,
    };
}
async function runEveningClose(userId, now) {
    const todayStart = startOfDayUtc(now);
    const tomorrowStart = addDays(todayStart, 1);
    const todayDate = toDateOnly(now);
    const tomorrowDate = toDateOnly(tomorrowStart);
    const unfinishedRows = await db
        .select({
        id: tasks.id,
        title: tasks.title,
    })
        .from(tasks)
        .where(and(eq(tasks.userId, userId), ne(tasks.status, 'done'), ne(tasks.status, 'cancelled'), or(lte(tasks.scheduledDate, todayDate), lte(tasks.dueDate, todayDate))))
        .orderBy(desc(tasks.priorityScore), asc(tasks.priority), asc(tasks.createdAt))
        .limit(300);
    let rescheduledTasks = 0;
    if (unfinishedRows.length > 0) {
        const unfinishedIds = unfinishedRows.map((row) => row.id);
        const updated = await db
            .update(tasks)
            .set({
            scheduledDate: tomorrowDate,
            updatedAt: sql `now()`,
        })
            .where(and(eq(tasks.userId, userId), inArray(tasks.id, unfinishedIds), ne(tasks.status, 'done'), ne(tasks.status, 'cancelled')))
            .returning({ id: tasks.id });
        rescheduledTasks = updated.length;
    }
    const [completedTodayCountRow, pendingInputCountRow, overdueCountRow] = await Promise.all([
        db
            .select({ count: sql `count(*)::int` })
            .from(tasks)
            .where(and(eq(tasks.userId, userId), gte(tasks.completedAt, todayStart.toISOString()), lt(tasks.completedAt, tomorrowStart.toISOString())))
            .then((rows) => rows[0]),
        db
            .select({ count: sql `count(*)::int` })
            .from(inputQueue)
            .where(and(eq(inputQueue.userId, userId), eq(inputQueue.status, 'pending')))
            .then((rows) => rows[0]),
        db
            .select({ count: sql `count(*)::int` })
            .from(tasks)
            .where(and(eq(tasks.userId, userId), lt(tasks.dueDate, tomorrowDate), ne(tasks.status, 'done'), ne(tasks.status, 'cancelled')))
            .then((rows) => rows[0]),
    ]);
    const completedTodayCount = Number(completedTodayCountRow?.count ?? 0);
    const pendingInputCount = Number(pendingInputCountRow?.count ?? 0);
    const overdueCount = Number(overdueCountRow?.count ?? 0);
    const insights = [
        `Evening review for ${todayDate}`,
        '',
        `Completed today: ${completedTodayCount}`,
        `Pending input queue items: ${pendingInputCount}`,
        `Overdue tasks remaining: ${overdueCount}`,
        `Rescheduled unfinished tasks to ${tomorrowDate}: ${rescheduledTasks}`,
        `Rescheduled tasks: ${summarizeTitles(unfinishedRows.slice(0, 5).map((row) => row.title))}`,
    ].join('\n');
    const reviewId = await upsertDailyReview({
        userId,
        reviewType: 'daily_close',
        scheduledAt: now.toISOString(),
        insights,
    });
    emitEvent(userId, 'system', 'system.brief_generated', {
        review_id: reviewId,
        review_type: 'daily_close',
    });
    emitEvent(userId, 'system', 'system.review_due', {
        review_type: 'daily_close',
    });
    return {
        phase: 'evening',
        reviewId,
        rescheduledTasks,
    };
}
async function runFullChecks(userId, now, phaseHint) {
    const phase = resolveFullCheckPhase(now, phaseHint);
    if (phase === 'morning') {
        return runMorningBrief(userId, now);
    }
    return runEveningClose(userId, now);
}
function assertCheckType(value) {
    if (value === 'quick' || value === 'full') {
        return value;
    }
    throw new Error(`Invalid heartbeat check type: ${value}`);
}
export async function runHeartbeatCheck(data, options = {}) {
    const now = options.now ?? new Date();
    const checkType = assertCheckType(data.checkType);
    const fullPhaseHint = options.fullPhase ?? 'auto';
    const quick = await runQuickChecks(data.userId, now);
    const full = checkType === 'full' ? await runFullChecks(data.userId, now, fullPhaseHint) : null;
    emitEvent(data.userId, 'system', 'system.heartbeat', {
        user_id: data.userId,
        check_type: checkType,
        source: options.source ?? 'worker',
        timestamp: now.toISOString(),
        quick,
        full,
    });
    return {
        userId: data.userId,
        checkType,
        ranAt: now.toISOString(),
        quick,
        full,
    };
}
export async function processHeartbeatJob(job) {
    return runHeartbeatCheck(job.data, {
        source: 'worker',
        fullPhase: 'auto',
    });
}
//# sourceMappingURL=heartbeat.js.map