import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

dotenv.config();

const connectionString =
  process.env.DATABASE_URL || 'postgresql://kira:kira@localhost:5432/kira';

const pool = new Pool({ connectionString });

export const db = drizzle(pool, { schema });
export { pool };
