import { eq, sql, desc } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../../db/index';
import { tasks, projects, documents, entities, conversations, messages, userXp, xpEvents, } from '../../db/schema';
import { asyncHandler, success } from './utils';
const dashboardsRouter = Router();
dashboardsRouter.get('/stats', asyncHandler(async (req, res) => {
    const userId = req.userId;
    // Task counts by status
    const taskRows = await db
        .select({
        status: tasks.status,
        count: sql `count(*)::int`,
    })
        .from(tasks)
        .where(eq(tasks.userId, userId))
        .groupBy(tasks.status);
    const taskMap = {};
    let taskTotal = 0;
    for (const r of taskRows) {
        taskMap[r.status] = r.count;
        taskTotal += r.count;
    }
    // Projects
    const projectRows = await db
        .select({
        status: projects.status,
        count: sql `count(*)::int`,
    })
        .from(projects)
        .where(eq(projects.userId, userId))
        .groupBy(projects.status);
    let projectTotal = 0;
    let projectActive = 0;
    for (const r of projectRows) {
        projectTotal += r.count;
        if (r.status !== 'completed' && r.status !== 'archived') {
            projectActive += r.count;
        }
    }
    // Documents
    const [docRow] = await db
        .select({ count: sql `count(*)::int` })
        .from(documents)
        .where(eq(documents.userId, userId));
    // Entities
    const [entityRow] = await db
        .select({ count: sql `count(*)::int` })
        .from(entities)
        .where(eq(entities.userId, userId));
    // Conversations & messages
    const [convRow] = await db
        .select({ count: sql `count(*)::int` })
        .from(conversations)
        .where(eq(conversations.userId, userId));
    const [msgRow] = await db
        .select({ count: sql `count(*)::int` })
        .from(messages)
        .where(eq(messages.userId, userId));
    // XP
    const [xpRow] = await db
        .select()
        .from(userXp)
        .where(eq(userXp.userId, userId))
        .limit(1);
    // Recent activity: last 15 xp_events as proxy for activity
    const recentXp = await db
        .select({
        reason: xpEvents.reason,
        createdAt: xpEvents.createdAt,
    })
        .from(xpEvents)
        .where(eq(xpEvents.userId, userId))
        .orderBy(desc(xpEvents.createdAt))
        .limit(15);
    const recentActivity = recentXp.map((ev) => {
        let type = 'task_created';
        const r = ev.reason.toLowerCase();
        if (r.includes('complet'))
            type = 'task_completed';
        else if (r.includes('message') || r.includes('chat'))
            type = 'message_sent';
        return {
            type,
            title: ev.reason,
            timestamp: ev.createdAt,
        };
    });
    success(res, {
        tasks: {
            total: taskTotal,
            todo: taskMap['todo'] ?? 0,
            inProgress: taskMap['in_progress'] ?? 0,
            done: taskMap['done'] ?? 0,
            blocked: taskMap['blocked'] ?? 0,
        },
        projects: {
            total: projectTotal,
            active: projectActive,
        },
        documents: {
            total: docRow?.count ?? 0,
        },
        entities: {
            total: entityRow?.count ?? 0,
        },
        conversations: {
            total: convRow?.count ?? 0,
            messagesTotal: msgRow?.count ?? 0,
        },
        xp: {
            level: xpRow?.level ?? 1,
            currentXp: xpRow?.totalXp ?? 0,
            streak: xpRow?.currentStreak ?? 0,
        },
        recentActivity,
    });
}));
dashboardsRouter.get('/recent-tasks', asyncHandler(async (req, res) => {
    const userId = req.userId;
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const recentTasks = await db
        .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        updatedAt: tasks.updatedAt,
    })
        .from(tasks)
        .where(eq(tasks.userId, userId))
        .orderBy(desc(tasks.updatedAt))
        .limit(limit);
    success(res, recentTasks);
}));
export { dashboardsRouter };
//# sourceMappingURL=dashboards.js.map