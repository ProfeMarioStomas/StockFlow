import { desc, eq, sql } from "drizzle-orm";
import type { Database } from "../db/client";
import { systemLogs } from "../db/schema";

// ── Domain types ──────────────────────────────────────────────────────────────

export type SystemLogRecord = {
  id: string;
  userId: string;
  note: string;
  createdAt: string;
  updatedAt: string;
};

// ── Mapper ────────────────────────────────────────────────────────────────────

function toSystemLogRecord(row: typeof systemLogs.$inferSelect): SystemLogRecord {
  return {
    id: row.id,
    userId: row.userId,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ── Repository type ───────────────────────────────────────────────────────────

export type SystemLogRepository = ReturnType<typeof createSystemLogRepository>;

// ── Factory ───────────────────────────────────────────────────────────────────

export function createSystemLogRepository(db: Database) {
  return {
    async findAll(filters?: { userId?: string }): Promise<SystemLogRecord[]> {
      if (filters?.userId !== undefined) {
        const rows = await db
          .select()
          .from(systemLogs)
          .where(eq(systemLogs.userId, filters.userId))
          .orderBy(desc(systemLogs.createdAt));
        return rows.map(toSystemLogRecord);
      }
      const rows = await db.select().from(systemLogs).orderBy(desc(systemLogs.createdAt));
      return rows.map(toSystemLogRecord);
    },

    async create(data: { userId: string; note: string }): Promise<SystemLogRecord> {
      const [row] = await db
        .insert(systemLogs)
        .values({ userId: data.userId, note: data.note })
        .returning();
      return toSystemLogRecord(row!);
    },

    async count(filters?: { userId?: string }): Promise<number> {
      if (filters?.userId !== undefined) {
        const [row] = await db
          .select({ total: sql<number>`count(*)` })
          .from(systemLogs)
          .where(eq(systemLogs.userId, filters.userId));
        return Number(row?.total ?? 0);
      }
      const [row] = await db.select({ total: sql<number>`count(*)` }).from(systemLogs);
      return Number(row?.total ?? 0);
    },

    async findPage(
      filters?: { userId?: string },
      pagination?: { limit: number; offset: number },
    ): Promise<SystemLogRecord[]> {
      const limit = pagination?.limit ?? 20;
      const offset = pagination?.offset ?? 0;

      if (filters?.userId !== undefined) {
        const rows = await db
          .select()
          .from(systemLogs)
          .where(eq(systemLogs.userId, filters.userId))
          .orderBy(desc(systemLogs.createdAt))
          .limit(limit)
          .offset(offset);
        return rows.map(toSystemLogRecord);
      }
      const rows = await db
        .select()
        .from(systemLogs)
        .orderBy(desc(systemLogs.createdAt))
        .limit(limit)
        .offset(offset);
      return rows.map(toSystemLogRecord);
    },
  };
}
