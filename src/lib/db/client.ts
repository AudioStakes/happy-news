import { drizzle } from 'drizzle-orm/d1';

import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from './schema';

export type Database = DrizzleD1Database<typeof schema>;

export const createDb = (binding: D1Database): Database => drizzle(binding, { schema });
