import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db/index';
import * as schema from '../db/schema';
import { scheduleUserHeartbeat } from './jobs/scheduler';
const isProduction = process.env.NODE_ENV === 'production';
const isBehindProxy = !!process.env.BEHIND_PROXY || !!process.env.CLOUDFLARE_TUNNEL;
export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3008',
    basePath: '/api/v1/auth',
    trustedOrigins: [
        'https://test.zenithcred.com',
        'https://test.ZenithCred.com',
        'https://test.ZENITHCRED.COM',
        'http://localhost:5173',
        'http://localhost:3008',
    ],
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
        provider: 'pg',
        schema,
    }),
    emailAndPassword: {
        enabled: true,
    },
    user: {
        modelName: 'users',
    },
    session: {
        modelName: 'sessions',
    },
    account: {
        modelName: 'accounts',
        fields: {
            password: 'accessToken',
        },
    },
    verification: {
        modelName: 'verification',
    },
    databaseHooks: {
        user: {
            create: {
                after: async (user) => {
                    if (!user?.id || typeof user.id !== 'string') {
                        return;
                    }
                    try {
                        await scheduleUserHeartbeat(user.id);
                    }
                    catch (error) {
                        console.error(`Failed to schedule heartbeat for new user ${user.id}.`, error);
                    }
                },
            },
        },
    },
    advanced: {
        database: {
            generateId: () => crypto.randomUUID(),
        },
        defaultCookieAttributes: {
            httpOnly: true,
            sameSite: 'lax',
            secure: isProduction || isBehindProxy,
        },
    },
});
//# sourceMappingURL=auth.js.map