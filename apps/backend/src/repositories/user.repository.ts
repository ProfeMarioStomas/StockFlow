import { desc, eq, sql } from "drizzle-orm";
import type { Database } from "../db/client";
import { users } from "../db/schema";
import type { UserResponse } from "../models/user.model";

// ── Domain type (includes passwordHash for internal use) ─────────────────────

export type UserRecord = UserResponse & {
  passwordHash: string;
};

// ── Mapping ───────────────────────────────────────────────────────────────────

function toUserRecord(row: typeof users.$inferSelect): UserRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    isActive: row.isActive,
    passwordHash: row.passwordHash,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ── Repository type ───────────────────────────────────────────────────────────

export type UserRepository = ReturnType<typeof createUserRepository>;

// ── Factory ───────────────────────────────────────────────────────────────────

export function createUserRepository(db: Database) {
  return {
    async findAll(): Promise<UserRecord[]> {
      const rows = await db.select().from(users);
      return rows.map(toUserRecord);
    },

    async findById(id: string): Promise<UserRecord | undefined> {
      const rows = await db.select().from(users).where(eq(users.id, id));
      return rows[0] ? toUserRecord(rows[0]) : undefined;
    },

    async findByEmail(email: string): Promise<UserRecord | undefined> {
      const rows = await db.select().from(users).where(eq(users.email, email));
      return rows[0] ? toUserRecord(rows[0]) : undefined;
    },

    async create(data: {
      name: string;
      email: string;
      passwordHash: string;
      role: "admin" | "seller";
    }): Promise<UserRecord> {
      const rows = await db.insert(users).values(data).returning();
      return toUserRecord(rows[0]!);
    },

    async update(
      id: string,
      data: Partial<{
        name: string;
        email: string;
        passwordHash: string;
        role: "admin" | "seller";
        isActive: boolean;
      }>,
    ): Promise<UserRecord | undefined> {
      const rows = await db.update(users).set(data).where(eq(users.id, id)).returning();
      return rows[0] ? toUserRecord(rows[0]) : undefined;
    },

    async softDelete(id: string): Promise<UserRecord | undefined> {
      const rows = await db
        .update(users)
        .set({ isActive: false })
        .where(eq(users.id, id))
        .returning();
      return rows[0] ? toUserRecord(rows[0]) : undefined;
    },

    async count(): Promise<number> {
      const [row] = await db
        .select({ total: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.isActive, true));
      return Number(row?.total ?? 0);
    },

    async findPage(pagination?: { limit: number; offset: number }): Promise<UserRecord[]> {
      const limit = pagination?.limit ?? 20;
      const offset = pagination?.offset ?? 0;
      const rows = await db
        .select()
        .from(users)
        .where(eq(users.isActive, true))
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);
      return rows.map(toUserRecord);
    },
  };
}
