import { drizzle } from 'drizzle-orm/d1';
import { env } from '$env/dynamic/private';

import * as schema from './schema';

void env;
export function createDb(database: D1Database) {
  return drizzle(database, { schema });
}

export type DbClient = ReturnType<typeof createDb>;
