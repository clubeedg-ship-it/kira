import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../../db/index';
import { userSettings, users } from '../../db/schema';
import { asyncHandler, success } from './utils';
const USE_OPENCLAW = process.env.USE_OPENCLAW === 'true';
const OPENCLAW_ALLOWED_USERS = (process.env.OPENCLAW_ALLOWED_USERS || '')
    .split(',').map(u => u.trim().toLowerCase()).filter(Boolean);
export const settingsRouter = Router();
// GET /api/v1/settings
settingsRouter.get('/', asyncHandler(async (req, res) => {
    const userId = req.userId;
    const [row] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId))
        .limit(1);
    success(res, row?.settings ?? {});
}));
// PATCH /api/v1/settings
settingsRouter.patch('/', asyncHandler(async (req, res) => {
    const userId = req.userId;
    const incoming = req.body.settings;
    if (typeof incoming !== 'object' || incoming === null || Array.isArray(incoming)) {
        return success(res, {});
    }
    const [existing] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId))
        .limit(1);
    const merged = { ...(existing?.settings ?? {}), ...incoming };
    if (existing) {
        await db
            .update(userSettings)
            .set({ settings: merged, updatedAt: new Date().toISOString() })
            .where(eq(userSettings.userId, userId));
    }
    else {
        await db
            .insert(userSettings)
            .values({ userId, settings: merged });
    }
    success(res, merged);
}));
// GET /api/v1/settings/connection-status
settingsRouter.get('/connection-status', asyncHandler(async (req, res) => {
    const userId = req.userId;
    let claudeMax = false;
    if (USE_OPENCLAW) {
        if (OPENCLAW_ALLOWED_USERS.length === 0) {
            claudeMax = true;
        }
        else {
            const [user] = await db.select({ name: users.name, email: users.email })
                .from(users).where(eq(users.id, userId)).limit(1);
            if (user) {
                claudeMax = OPENCLAW_ALLOWED_USERS.includes(user.name.toLowerCase())
                    || OPENCLAW_ALLOWED_USERS.includes(user.email.toLowerCase());
            }
        }
    }
    success(res, {
        claudeMax,
        model: claudeMax ? 'claude-opus-4-6' : null,
        provider: claudeMax ? 'Claude Max (Anthropic)' : 'OpenRouter',
    });
}));
//# sourceMappingURL=settings.js.map