import dotenv from 'dotenv';
import { asc, eq } from 'drizzle-orm';
dotenv.config();
import { db } from '../../db/index';
import { users } from '../../db/schema';
import { runHeartbeatCheck } from './heartbeat';
function parseUserIdArg(argv) {
    const userIdFlagIndex = argv.findIndex((arg) => arg === '--user-id' || arg === '--userId');
    if (userIdFlagIndex >= 0) {
        return argv[userIdFlagIndex + 1] ?? null;
    }
    const userEqualsArg = argv.find((arg) => arg.startsWith('--user-id=') || arg.startsWith('--userId='));
    if (userEqualsArg) {
        return userEqualsArg.split('=')[1] ?? null;
    }
    if (argv.length > 0 && !argv[0]?.startsWith('--')) {
        return argv[0] ?? null;
    }
    return null;
}
function parseModeArg(argv) {
    const modeFlagIndex = argv.findIndex((arg) => arg === '--mode');
    if (modeFlagIndex >= 0) {
        const mode = argv[modeFlagIndex + 1];
        if (mode === 'auto' || mode === 'morning' || mode === 'evening') {
            return mode;
        }
    }
    const modeEqualsArg = argv.find((arg) => arg.startsWith('--mode='));
    if (modeEqualsArg) {
        const mode = modeEqualsArg.split('=')[1];
        if (mode === 'auto' || mode === 'morning' || mode === 'evening') {
            return mode;
        }
    }
    return 'morning';
}
async function resolveUserIds(argv) {
    const userIdArg = parseUserIdArg(argv)?.trim();
    if (userIdArg) {
        const [row] = await db.select({ id: users.id }).from(users).where(eq(users.id, userIdArg)).limit(1);
        if (!row) {
            throw new Error(`User ${userIdArg} not found.`);
        }
        return [row.id];
    }
    const rows = await db.select({ id: users.id }).from(users).orderBy(asc(users.createdAt));
    return rows.map((row) => row.id);
}
async function main() {
    const argv = process.argv.slice(2);
    const mode = parseModeArg(argv);
    const userIds = await resolveUserIds(argv);
    if (userIds.length === 0) {
        console.log('[heartbeat:once] No users found. Nothing to do.');
        process.exit(0);
        return;
    }
    for (const userId of userIds) {
        const result = await runHeartbeatCheck({
            userId,
            checkType: 'full',
        }, {
            source: 'cli',
            fullPhase: mode,
        });
        console.log(`[heartbeat:once] user=${userId} full-check complete | overdue=${result.quick.overdueTasks} review=${result.full?.reviewId ?? 'none'}`);
    }
    process.exit(0);
}
void main().catch((error) => {
    console.error('[heartbeat:once] Failed to run heartbeat.', error);
    process.exit(1);
});
//# sourceMappingURL=heartbeat-cli.js.map