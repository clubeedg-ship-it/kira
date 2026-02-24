import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import { db } from '../../db/index';
import { dependencies, keyResults, milestones, objectives, projects, tasks } from '../../db/schema';
import { awardXP, calculateTaskXP, checkStreak } from './xp';
function clampProgress(value) {
    if (!Number.isFinite(value)) {
        return 0;
    }
    return Math.max(0, Math.min(100, value));
}
async function recalculateObjectiveProgress(userId, objectiveId) {
    const rows = await db
        .select({
        currentValue: keyResults.currentValue,
        targetValue: keyResults.targetValue,
    })
        .from(keyResults)
        .where(and(eq(keyResults.userId, userId), eq(keyResults.objectiveId, objectiveId)));
    const average = rows.length === 0
        ? 0
        : rows.reduce((sum, row) => {
            if (row.targetValue <= 0) {
                return sum;
            }
            const pct = clampProgress((row.currentValue / row.targetValue) * 100);
            return sum + pct;
        }, 0) / rows.length;
    await db
        .update(objectives)
        .set({
        progress: Math.round(average),
        updatedAt: sql `now()`,
    })
        .where(and(eq(objectives.userId, userId), eq(objectives.id, objectiveId)));
}
async function cancelTasksForProjects(userId, projectIds) {
    if (projectIds.length === 0) {
        return;
    }
    await db
        .update(tasks)
        .set({
        status: 'cancelled',
        updatedAt: sql `now()`,
    })
        .where(and(eq(tasks.userId, userId), inArray(tasks.projectId, projectIds), ne(tasks.status, 'done'), ne(tasks.status, 'cancelled')));
}
export async function onTaskComplete(userId, taskId) {
    const [taskRow] = await db
        .select({
        id: tasks.id,
        milestoneId: tasks.milestoneId,
        projectId: tasks.projectId,
        status: tasks.status,
        durationEst: tasks.durationEst,
    })
        .from(tasks)
        .where(and(eq(tasks.userId, userId), eq(tasks.id, taskId)))
        .limit(1);
    if (!taskRow || taskRow.status !== 'done') {
        return;
    }
    // Award XP for task completion
    const taskXP = calculateTaskXP({ durationEst: taskRow.durationEst });
    await awardXP(userId, taskXP, 'task_complete', taskId);
    await checkStreak(userId);
    let projectId = taskRow.projectId;
    if (taskRow.milestoneId) {
        const milestoneTaskRows = await db
            .select({ status: tasks.status })
            .from(tasks)
            .where(and(eq(tasks.userId, userId), eq(tasks.milestoneId, taskRow.milestoneId)));
        if (milestoneTaskRows.length > 0 &&
            milestoneTaskRows.every((milestoneTask) => milestoneTask.status === 'done')) {
            await db
                .update(milestones)
                .set({
                status: 'completed',
                completedAt: sql `now()`,
            })
                .where(and(eq(milestones.userId, userId), eq(milestones.id, taskRow.milestoneId)));
            await awardXP(userId, 100, 'milestone_complete', taskRow.milestoneId);
        }
        if (!projectId) {
            const [milestoneRow] = await db
                .select({ projectId: milestones.projectId })
                .from(milestones)
                .where(and(eq(milestones.userId, userId), eq(milestones.id, taskRow.milestoneId)))
                .limit(1);
            projectId = milestoneRow?.projectId ?? null;
        }
    }
    if (projectId) {
        const projectMilestones = await db
            .select({ status: milestones.status })
            .from(milestones)
            .where(and(eq(milestones.userId, userId), eq(milestones.projectId, projectId)));
        if (projectMilestones.length > 0 &&
            projectMilestones.every((milestone) => milestone.status === 'completed')) {
            await db
                .update(projects)
                .set({
                status: 'completed',
                completedAt: sql `now()`,
                updatedAt: sql `now()`,
            })
                .where(and(eq(projects.userId, userId), eq(projects.id, projectId)));
        }
    }
    // FIX-006: explicit user_id filter prevents cross-tenant leak
    const downstreamDependencies = await db
        .select({ blockedId: dependencies.blockedId })
        .from(dependencies)
        .where(and(eq(dependencies.userId, userId), eq(dependencies.blockerType, 'task'), eq(dependencies.blockedType, 'task'), eq(dependencies.blockerId, taskId)));
    const blockedTaskIds = [...new Set(downstreamDependencies.map((row) => row.blockedId))];
    for (const blockedTaskId of blockedTaskIds) {
        // FIX-006: explicit user_id filter on both tasks JOIN and dependencies WHERE prevents cross-tenant leak
        const blockerStatuses = await db
            .select({ status: tasks.status })
            .from(dependencies)
            .innerJoin(tasks, and(eq(tasks.id, dependencies.blockerId), eq(tasks.userId, userId)))
            .where(and(eq(dependencies.userId, userId), eq(dependencies.blockerType, 'task'), eq(dependencies.blockedType, 'task'), eq(dependencies.blockedId, blockedTaskId)));
        if (blockerStatuses.length > 0 && blockerStatuses.every((row) => row.status === 'done')) {
            await db
                .update(tasks)
                .set({
                status: 'todo',
                updatedAt: sql `now()`,
            })
                .where(and(eq(tasks.userId, userId), eq(tasks.id, blockedTaskId), eq(tasks.status, 'waiting')));
        }
    }
    if (projectId) {
        await onProjectStatusChange(userId, projectId, 'completed');
    }
}
export async function onProjectStatusChange(userId, projectId, _newStatus) {
    const [projectRow] = await db
        .select({ objectiveId: projects.objectiveId })
        .from(projects)
        .where(and(eq(projects.userId, userId), eq(projects.id, projectId)))
        .limit(1);
    if (!projectRow?.objectiveId) {
        return;
    }
    await recalculateObjectiveProgress(userId, projectRow.objectiveId);
}
export async function onKeyResultUpdate(userId, keyResultId) {
    const [keyResultRow] = await db
        .select({ objectiveId: keyResults.objectiveId })
        .from(keyResults)
        .where(and(eq(keyResults.userId, userId), eq(keyResults.id, keyResultId)))
        .limit(1);
    if (!keyResultRow) {
        return;
    }
    await recalculateObjectiveProgress(userId, keyResultRow.objectiveId);
}
export async function onParentArchived(userId, entityType, entityId) {
    if (entityType === 'project') {
        await cancelTasksForProjects(userId, [entityId]);
        return;
    }
    if (entityType === 'objective') {
        const objectiveProjectRows = await db
            .select({ id: projects.id })
            .from(projects)
            .where(and(eq(projects.userId, userId), eq(projects.objectiveId, entityId)));
        const objectiveProjectIds = objectiveProjectRows.map((row) => row.id);
        await db
            .update(projects)
            .set({
            status: 'archived',
            updatedAt: sql `now()`,
        })
            .where(and(eq(projects.userId, userId), eq(projects.objectiveId, entityId), ne(projects.status, 'archived')));
        await cancelTasksForProjects(userId, objectiveProjectIds);
        return;
    }
    await db
        .update(objectives)
        .set({
        status: 'archived',
        updatedAt: sql `now()`,
    })
        .where(and(eq(objectives.userId, userId), eq(objectives.areaId, entityId), ne(objectives.status, 'archived')));
    const areaProjectRows = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.userId, userId), eq(projects.areaId, entityId)));
    const areaProjectIds = areaProjectRows.map((row) => row.id);
    await db
        .update(projects)
        .set({
        status: 'archived',
        updatedAt: sql `now()`,
    })
        .where(and(eq(projects.userId, userId), eq(projects.areaId, entityId), ne(projects.status, 'archived')));
    await cancelTasksForProjects(userId, areaProjectIds);
}
//# sourceMappingURL=cascade.js.map