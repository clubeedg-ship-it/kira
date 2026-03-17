import fs from 'node:fs';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../../db/index';
import { userSettings, users } from '../../db/schema';
import { asyncHandler, success } from './utils';
const USE_OPENCLAW = process.env.USE_OPENCLAW === 'true';
const OPENCLAW_ALLOWED_USERS = (process.env.OPENCLAW_ALLOWED_USERS || '')
    .split(',').map(u => u.trim().toLowerCase()).filter(Boolean);
function prettifyProvider(providerId) {
    if (!providerId)
        return null;
    switch (providerId) {
        case 'anthropic':
            return 'Anthropic';
        case 'openai':
            return 'OpenAI';
        case 'openai-codex':
            return 'OpenAI Codex';
        case 'openrouter':
            return 'OpenRouter';
        case 'google':
            return 'Google';
        default:
            return providerId
                .split('-')
                .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                .join(' ');
    }
}
function prettifyModel(modelId) {
    if (!modelId)
        return null;
    const shortId = modelId.includes('/') ? modelId.split('/').at(-1) ?? modelId : modelId;
    return shortId
        .split(/[-_]/)
        .filter(Boolean)
        .map((part) => {
        if (/^gpt$/i.test(part))
            return 'GPT';
        if (/^o\d+$/i.test(part))
            return part.toUpperCase();
        if (/^\d+(\.\d+)?$/.test(part))
            return part;
        return part.charAt(0).toUpperCase() + part.slice(1);
    })
        .join(' ');
}
function readOpenClawConnectionState() {
    try {
        const home = process.env.HOME || '/root';
        const configPath = process.env.OPENCLAW_CONFIG_PATH || path.join(home, '.openclaw', 'openclaw.json');
        const raw = fs.readFileSync(configPath, 'utf8');
        const parsed = JSON.parse(raw);
        const modelId = parsed.agents?.defaults?.model?.primary ?? null;
        const providerId = modelId?.includes('/') ? modelId.split('/')[0] : null;
        return {
            connected: Boolean(modelId),
            provider: prettifyProvider(providerId),
            model: prettifyModel(modelId),
            modelId,
        };
    }
    catch {
        return {
            connected: false,
            provider: null,
            model: null,
            modelId: null,
        };
    }
}
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
    let openClawEnabled = false;
    if (USE_OPENCLAW) {
        if (OPENCLAW_ALLOWED_USERS.length === 0) {
            openClawEnabled = true;
        }
        else {
            const [user] = await db.select({ name: users.name, email: users.email })
                .from(users).where(eq(users.id, userId)).limit(1);
            if (user) {
                openClawEnabled = OPENCLAW_ALLOWED_USERS.includes(user.name.toLowerCase())
                    || OPENCLAW_ALLOWED_USERS.includes(user.email.toLowerCase());
            }
        }
    }
    const state = openClawEnabled ? readOpenClawConnectionState() : {
        connected: false,
        provider: null,
        model: null,
        modelId: null,
    };
    success(res, {
        openClawEnabled,
        connected: state.connected,
        model: state.model,
        modelId: state.modelId,
        provider: state.provider,
        providerLabel: state.provider ? `${state.provider} via OpenClaw` : 'OpenClaw',
        fallbackProvider: 'OpenRouter',
    });
}));
//# sourceMappingURL=settings.js.map