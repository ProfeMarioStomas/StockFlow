import { desc, eq, sql } from "drizzle-orm";
import type { Database } from "../db/client";
import { products } from "../db/schema";

// ── Domain type ───────────────────────────────────────────────────────────────

export type ProductRecord = {
  id: string;
  name: string;
  price: number;
  stock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// ── Mapping ───────────────────────────────────────────────────────────────────

function toProductRecord(row: typeof products.$inferSelect): ProductRecord {
  return {
    id: row.id,
    name: row.name,
    price: parseFloat(row.price),
    stock: row.stock,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ── Repository type ───────────────────────────────────────────────────────────

export type ProductRepository = ReturnType<typeof createProductRepository>;

// ── Factory ───────────────────────────────────────────────────────────────────

export function createProductRepository(db: Database) {
  return {
    async findAll(filters?: { isActive?: boolean }): Promise<ProductRecord[]> {
      if (filters?.isActive !== undefined) {
        const rows = await db
          .select()
          .from(products)
          .where(eq(products.isActive, filters.isActive));
        return rows.map(toProductRecord);
      }
      const rows = await db.select().from(products);
      return rows.map(toProductRecord);
    },

    async findById(id: string): Promise<ProductRecord | undefined> {
      const rows = await db.select().from(products).where(eq(products.id, id));
      return rows[0] ? toProductRecord(rows[0]) : undefined;
    },

    async create(data: { name: string; price: number; stock?: number }): Promise<ProductRecord> {
      const rows = await db
        .insert(products)
        .values({
          name: data.name,
          price: String(data.price),
          ...(data.stock !== undefined ? { stock: data.stock } : {}),
        })
        .returning();
      return toProductRecord(rows[0]!);
    },

    async update(
      id: string,
      data: Partial<{ name: string; price: number; isActive: boolean }>,
    ): Promise<ProductRecord | undefined> {
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.price !== undefined) updateData.price = String(data.price);
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      const rows = await db.update(products).set(updateData).where(eq(products.id, id)).returning();
      return rows[0] ? toProductRecord(rows[0]) : undefined;
    },

    async softDelete(id: string): Promise<ProductRecord | undefined> {
      const rows = await db
        .update(products)
        .set({ isActive: false })
        .where(eq(products.id, id))
        .returning();
      return rows[0] ? toProductRecord(rows[0]) : undefined;
    },

    async count(filters?: { isActive?: boolean }): Promise<number> {
      if (filters?.isActive !== undefined) {
        const [row] = await db
          .select({ total: sql<number>`count(*)` })
          .from(products)
          .where(eq(products.isActive, filters.isActive));
        return Number(row?.total ?? 0);
      }
      const [row] = await db.select({ total: sql<number>`count(*)` }).from(products);
      return Number(row?.total ?? 0);
    },

    async findPage(
      filters?: { isActive?: boolean },
      pagination?: { limit: number; offset: number },
    ): Promise<ProductRecord[]> {
      const limit = pagination?.limit ?? 20;
      const offset = pagination?.offset ?? 0;

      if (filters?.isActive !== undefined) {
        const rows = await db
          .select()
          .from(products)
          .where(eq(products.isActive, filters.isActive))
          .orderBy(desc(products.createdAt))
          .limit(limit)
          .offset(offset);
        return rows.map(toProductRecord);
      }
      const rows = await db
        .select()
        .from(products)
        .orderBy(desc(products.createdAt))
        .limit(limit)
        .offset(offset);
      return rows.map(toProductRecord);
    },
  };
}
