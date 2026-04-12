import { and, eq, lt } from "drizzle-orm";
import type { Database } from "../db/client";
import { sessions } from "../db/schema";

// ── Domain type ───────────────────────────────────────────────────────────────

export type SessionRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string; // ISO 8601
  createdAt: string;
  updatedAt: string;
};

// ── Mapping ───────────────────────────────────────────────────────────────────

function toSessionRecord(row: typeof sessions.$inferSelect): SessionRecord {
  return {
    id: row.id,
    userId: row.userId,
    tokenHash: row.tokenHash,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ── Repository type ───────────────────────────────────────────────────────────

export type SessionRepository = ReturnType<typeof createSessionRepository>;

// ── Factory ───────────────────────────────────────────────────────────────────

export function createSessionRepository(db: Database) {
  return {
    async create(data: {
      userId: string;
      tokenHash: string;
      expiresAt: Date;
    }): Promise<SessionRecord> {
      const rows = await db.insert(sessions).values(data).returning();
      return toSessionRecord(rows[0]!);
    },

    async findByTokenHash(hash: string): Promise<SessionRecord | undefined> {
      const rows = await db.select().from(sessions).where(eq(sessions.tokenHash, hash));
      return rows[0] ? toSessionRecord(rows[0]) : undefined;
    },

    async deleteByTokenHash(hash: string): Promise<void> {
      await db.delete(sessions).where(eq(sessions.tokenHash, hash));
    },

    async deleteExpiredByUserId(userId: string): Promise<void> {
      await db
        .delete(sessions)
        .where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, new Date())));
    },
  };
}
