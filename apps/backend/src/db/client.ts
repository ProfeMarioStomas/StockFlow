import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Creates a Drizzle client backed by the Neon HTTP driver.
 * Call once per request — pass the databaseUrl from config, never from c.env directly.
 *
 * Usage:
 *   const db = createDb(config.DATABASE_URL);
 */
export function createDb(databaseUrl: string) {
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}

export type Database = ReturnType<typeof createDb>;
