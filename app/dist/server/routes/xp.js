import { desc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../../db/index';
import { userXp, xpEvents } from '../../db/schema';
import { calculateLevel, getLevelTitle } from '../engine/xp';
import { asyncHandler, getInteger, getQueryString, success } from './utils';
const xpRouter = Router();
xpRouter.get('/', asyncHandler(async (req, res) => {
    const [record] = await db
        .select()
        .from(userXp)
        .where(eq(userXp.userId, req.userId))
        .limit(1);
    if (!record) {
        // User has no XP record yet — return defaults
        const { title, icon } = getLevelTitle(1);
        success(res, {
            total_xp: 0,
            level: 1,
            title,
            icon,
            progress: 0,
            xp_to_next_level: 100,
            current_streak: 0,
            longest_streak: 0,
            streak_freezes: 1,
        });
        return;
    }
    const { level, progress, xpForNextLevel } = calculateLevel(record.totalXp);
    const { title, icon } = getLevelTitle(level);
    success(res, {
        total_xp: record.totalXp,
        level,
        title,
        icon,
        progress,
        xp_to_next_level: xpForNextLevel - record.totalXp,
        current_streak: record.currentStreak,
        longest_streak: record.longestStreak,
        streak_freezes: record.streakFreezesAvailable - record.streakFreezesUsedThisWeek,
    });
}));
xpRouter.get('/history', asyncHandler(async (req, res) => {
    const limitRaw = getQueryString(req.query.limit);
    const limit = limitRaw ? (getInteger(limitRaw) ?? 20) : 20;
    const clampedLimit = Math.min(Math.max(limit, 1), 100);
    const rows = await db
        .select()
        .from(xpEvents)
        .where(eq(xpEvents.userId, req.userId))
        .orderBy(desc(xpEvents.createdAt))
        .limit(clampedLimit);
    success(res, rows);
}));
xpRouter.get('/leaderboard', asyncHandler(async (_req, res) => {
    res.status(404).json({
        error: {
            code: 'NOT_IMPLEMENTED',
            message: 'Leaderboard is not yet available',
        },
    });
}));
export { xpRouter };
//# sourceMappingURL=xp.js.map