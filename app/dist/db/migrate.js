import dotenv from 'dotenv';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'node:url';
import { db, pool } from './index';
dotenv.config();
export async function runMigrations() {
    await db.execute(sql `CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
    await migrate(db, { migrationsFolder: 'src/db/migrations' });
    console.log('Database migrations completed successfully.');
}
async function main() {
    try {
        await runMigrations();
    }
    catch (error) {
        console.error('Database migration failed.', error);
        process.exitCode = 1;
    }
    finally {
        await pool.end();
    }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    void main();
}
//# sourceMappingURL=migrate.js.map