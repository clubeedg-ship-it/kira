import { Router } from 'express';
import { and, avg, count, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '../../db/index';
import { contextMetrics } from '../../db/schema';
import { asyncHandler, success } from './utils';
export const contextMetricsRouter = Router();
contextMetricsRouter.get('/', asyncHandler(async (req, res) => {
    const userId = req.query.user_id;
    const from = req.query.from;
    const to = req.query.to;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const conditions = [];
    if (userId)
        conditions.push(eq(contextMetrics.userId, userId));
    if (from)
        conditions.push(gte(contextMetrics.createdAt, from));
    if (to)
        conditions.push(lte(contextMetrics.createdAt, to));
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    // Aggregate stats
    const [stats] = await db
        .select({
        avgEfficiency: avg(contextMetrics.efficiencyScore),
        avgSystemTokens: avg(contextMetrics.systemPromptTokens),
        avgHistoryTokens: avg(contextMetrics.historyTokens),
        avgResponseTokens: avg(contextMetrics.responseTokens),
        totalRequests: count(),
    })
        .from(contextMetrics)
        .where(where);
    // Worst offenders (lowest efficiency)
    const worstOffenders = await db
        .select()
        .from(contextMetrics)
        .where(where)
        .orderBy(contextMetrics.efficiencyScore)
        .limit(10);
    // Trend: daily averages
    const trend = await db
        .select({
        date: sql `date_trunc('day', ${contextMetrics.createdAt})::date`.as('date'),
        avgEfficiency: avg(contextMetrics.efficiencyScore),
        avgInputTokens: sql `avg(${contextMetrics.systemPromptTokens} + ${contextMetrics.historyTokens})`,
        requests: count(),
    })
        .from(contextMetrics)
        .where(where)
        .groupBy(sql `date_trunc('day', ${contextMetrics.createdAt})::date`)
        .orderBy(desc(sql `date_trunc('day', ${contextMetrics.createdAt})::date`))
        .limit(30);
    // Recent entries
    const recent = await db
        .select()
        .from(contextMetrics)
        .where(where)
        .orderBy(desc(contextMetrics.createdAt))
        .limit(limit);
    success(res, {
        summary: {
            avgEfficiency: stats.avgEfficiency ? parseFloat(String(stats.avgEfficiency)) : null,
            avgSystemTokens: stats.avgSystemTokens ? Math.round(parseFloat(String(stats.avgSystemTokens))) : null,
            avgHistoryTokens: stats.avgHistoryTokens ? Math.round(parseFloat(String(stats.avgHistoryTokens))) : null,
            avgResponseTokens: stats.avgResponseTokens ? Math.round(parseFloat(String(stats.avgResponseTokens))) : null,
            totalRequests: stats.totalRequests,
        },
        worstOffenders,
        trend,
        recent,
    });
}));
//# sourceMappingURL=context-metrics.js.map