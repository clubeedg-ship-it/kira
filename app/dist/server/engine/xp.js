import { eq, sql } from 'drizzle-orm';
import { db } from '../../db/index';
import { userXp, xpEvents } from '../../db/schema';
import { emitEvent } from '../events/sse';
const LEVEL_TITLES = [
    { min: 1, max: 5, title: 'Newcomer', icon: '🌱' },
    { min: 6, max: 10, title: 'Explorer', icon: '🧭' },
    { min: 11, max: 18, title: 'Builder', icon: '🔨' },
    { min: 19, max: 28, title: 'Master', icon: '⚡' },
    { min: 29, max: 38, title: 'Architect', icon: '🏛️' },
    { min: 39, max: 45, title: 'Visionary', icon: '🔮' },
    { min: 46, max: 50, title: 'Legend', icon: '👑' },
];
export function getLevelTitle(level) {
    for (const tier of LEVEL_TITLES) {
        if (level >= tier.min && level <= tier.max) {
            return { title: tier.title, icon: tier.icon };
        }
    }
    return { title: 'Legend', icon: '👑' };
}
export function calculateLevel(totalXp) {
    let level = 1;
    while (true) {
        const xpNeeded = Math.floor(100 * Math.pow(level, 1.5));
        if (totalXp < xpNeeded) {
            const prevXp = level > 1 ? Math.floor(100 * Math.pow(level - 1, 1.5)) : 0;
            const xpInLevel = totalXp - prevXp;
            const xpForLevel = xpNeeded - prevXp;
            const progress = xpForLevel > 0 ? Math.min(100, Math.round((xpInLevel / xpForLevel) * 100)) : 0;
            return { level, xpForCurrentLevel: prevXp, xpForNextLevel: xpNeeded, progress };
        }
        level++;
        if (level > 50) {
            const prevXp = Math.floor(100 * Math.pow(50, 1.5));
            return { level: 50, xpForCurrentLevel: prevXp, xpForNextLevel: prevXp, progress: 100 };
        }
    }
}
function getTodayDateKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
async function ensureUserXp(userId) {
    const [existing] = await db
        .select()
        .from(userXp)
        .where(eq(userXp.userId, userId))
        .limit(1);
    if (existing)
        return existing;
    const [created] = await db
        .insert(userXp)
        .values({ userId })
        .onConflictDoNothing()
        .returning();
    if (created)
        return created;
    // Race condition: another insert won
    const [row] = await db
        .select()
        .from(userXp)
        .where(eq(userXp.userId, userId))
        .limit(1);
    return row;
}
export async function awardXP(userId, amount, reason, referenceId) {
    if (amount <= 0)
        return;
    const record = await ensureUserXp(userId);
    if (!record)
        return;
    // Insert xp_event
    await db.insert(xpEvents).values({
        userId,
        amount,
        reason,
        referenceId: referenceId ?? null,
    });
    // Update total_xp
    const newTotal = record.totalXp + amount;
    const oldLevel = record.level;
    const { level: newLevel, progress, xpForNextLevel } = calculateLevel(newTotal);
    const { title, icon } = getLevelTitle(newLevel);
    await db
        .update(userXp)
        .set({
        totalXp: newTotal,
        level: newLevel,
        updatedAt: sql `now()`,
    })
        .where(eq(userXp.userId, userId));
    // Emit xp.gained SSE event
    emitEvent(userId, 'xp', 'xp.gained', {
        amount,
        reason,
        newTotal,
        level: newLevel,
        progress,
        title,
        icon,
    });
    // Emit level_up if level changed
    if (newLevel > oldLevel) {
        emitEvent(userId, 'xp', 'xp.level_up', {
            newLevel,
            title,
            icon,
            previousLevel: oldLevel,
        });
    }
}
export function calculateTaskXP(task) {
    // Base 10 XP + complexity bonus
    // Use duration estimate as rough complexity proxy: xs(<15m)=0, s(15-30m)=1, m(30-60m)=2, l(1-3h)=3, xl(>3h)=4
    const dur = task.durationEst ?? 0;
    let complexity = 0;
    if (dur > 180)
        complexity = 4;
    else if (dur > 60)
        complexity = 3;
    else if (dur > 30)
        complexity = 2;
    else if (dur > 15)
        complexity = 1;
    return 10 + 5 * complexity;
}
export async function checkStreak(userId) {
    const record = await ensureUserXp(userId);
    if (!record)
        return;
    const today = getTodayDateKey();
    if (record.lastActiveDate === today)
        return; // Already checked in today
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    let newStreak = record.currentStreak;
    let newLongest = record.longestStreak;
    let streakBroken = false;
    let freezeUsed = false;
    if (record.lastActiveDate === yesterdayKey || record.lastActiveDate === null) {
        // Consecutive day or first ever activity
        newStreak = record.currentStreak + 1;
    }
    else if (record.lastActiveDate !== null) {
        // Missed day(s) — check freeze
        const daysSinceActive = Math.floor((new Date(today + 'T00:00:00').getTime() - new Date(record.lastActiveDate + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceActive === 2 && record.streakFreezesAvailable > record.streakFreezesUsedThisWeek) {
            // Use a freeze for the single missed day
            newStreak = record.currentStreak + 1;
            freezeUsed = true;
        }
        else {
            // Streak broken
            const previousStreak = record.currentStreak;
            newStreak = 1;
            streakBroken = true;
            if (previousStreak > 0) {
                emitEvent(userId, 'xp', 'xp.streak_broken', {
                    previousStreak,
                    longestStreak: Math.max(record.longestStreak, previousStreak),
                });
            }
        }
    }
    if (newStreak > newLongest) {
        newLongest = newStreak;
    }
    const updateValues = {
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastActiveDate: today,
        updatedAt: sql `now()`,
    };
    if (freezeUsed) {
        updateValues.streakFreezesUsedThisWeek = record.streakFreezesUsedThisWeek + 1;
    }
    await db
        .update(userXp)
        .set(updateValues)
        .where(eq(userXp.userId, userId));
    // Award streak bonus XP
    if (!streakBroken && newStreak > 1) {
        const streakBonus = 5 * newStreak;
        await awardXP(userId, streakBonus, 'streak_bonus');
    }
    emitEvent(userId, 'xp', 'xp.streak_updated', {
        currentStreak: newStreak,
        longestStreak: newLongest,
        isFrozen: freezeUsed,
    });
}
//# sourceMappingURL=xp.js.map