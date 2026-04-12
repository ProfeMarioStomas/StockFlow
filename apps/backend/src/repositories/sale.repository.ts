import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "../db/client";
import { saleDetails, sales } from "../db/schema";

// ── Domain types ──────────────────────────────────────────────────────────────

export type SaleRecord = {
  id: string;
  totalAmount: number;
  paymentMethod: "cash" | "card" | "transfer";
  sellerId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SaleDetailRecord = {
  id: string;
  saleId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  createdAt: string;
  updatedAt: string;
};

// ── Mappers ───────────────────────────────────────────────────────────────────

function toSaleRecord(row: typeof sales.$inferSelect): SaleRecord {
  return {
    id: row.id,
    totalAmount: parseFloat(row.totalAmount),
    paymentMethod: row.paymentMethod,
    sellerId: row.sellerId,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toSaleDetailRecord(row: typeof saleDetails.$inferSelect): SaleDetailRecord {
  return {
    id: row.id,
    saleId: row.saleId,
    productId: row.productId,
    quantity: row.quantity,
    unitPrice: parseFloat(row.unitPrice),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ── Repository type ───────────────────────────────────────────────────────────

export type SaleRepository = ReturnType<typeof createSaleRepository>;

// ── Factory ───────────────────────────────────────────────────────────────────

export function createSaleRepository(db: Database) {
  return {
    async findAll(filters?: { isActive?: boolean }): Promise<SaleRecord[]> {
      if (filters?.isActive !== undefined) {
        const rows = await db.select().from(sales).where(eq(sales.isActive, filters.isActive));
        return rows.map(toSaleRecord);
      }
      const rows = await db.select().from(sales);
      return rows.map(toSaleRecord);
    },

    async findById(id: string): Promise<SaleRecord | undefined> {
      const rows = await db.select().from(sales).where(eq(sales.id, id));
      return rows[0] ? toSaleRecord(rows[0]) : undefined;
    },

    async findDetailsBySaleId(saleId: string): Promise<SaleDetailRecord[]> {
      const rows = await db.select().from(saleDetails).where(eq(saleDetails.saleId, saleId));
      return rows.map(toSaleDetailRecord);
    },

    async findDetailsBySaleIds(ids: string[]): Promise<SaleDetailRecord[]> {
      if (ids.length === 0) return [];
      const rows = await db.select().from(saleDetails).where(inArray(saleDetails.saleId, ids));
      return rows.map(toSaleDetailRecord);
    },

    async findDetailById(saleId: string, detailId: string): Promise<SaleDetailRecord | undefined> {
      const rows = await db
        .select()
        .from(saleDetails)
        .where(and(eq(saleDetails.id, detailId), eq(saleDetails.saleId, saleId)));
      return rows[0] ? toSaleDetailRecord(rows[0]) : undefined;
    },

    async updateHeader(
      id: string,
      data: Partial<{ paymentMethod: "cash" | "card" | "transfer"; isActive: boolean }>,
    ): Promise<SaleRecord | undefined> {
      const updateData: Record<string, unknown> = {};
      if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      const rows = await db.update(sales).set(updateData).where(eq(sales.id, id)).returning();
      return rows[0] ? toSaleRecord(rows[0]) : undefined;
    },

    async updateDetail(
      detailId: string,
      data: Partial<{ quantity: number; unitPrice: number }>,
    ): Promise<SaleDetailRecord | undefined> {
      const updateData: Record<string, unknown> = {};
      if (data.quantity !== undefined) updateData.quantity = data.quantity;
      if (data.unitPrice !== undefined) updateData.unitPrice = String(data.unitPrice);

      const rows = await db
        .update(saleDetails)
        .set(updateData)
        .where(eq(saleDetails.id, detailId))
        .returning();
      return rows[0] ? toSaleDetailRecord(rows[0]) : undefined;
    },

    async updateTotalAmount(id: string, total: number): Promise<SaleRecord | undefined> {
      const rows = await db
        .update(sales)
        .set({ totalAmount: String(total) })
        .where(eq(sales.id, id))
        .returning();
      return rows[0] ? toSaleRecord(rows[0]) : undefined;
    },

    async softDelete(id: string): Promise<SaleRecord | undefined> {
      const rows = await db
        .update(sales)
        .set({ isActive: false })
        .where(eq(sales.id, id))
        .returning();
      return rows[0] ? toSaleRecord(rows[0]) : undefined;
    },

    async count(filters?: { isActive?: boolean }): Promise<number> {
      if (filters?.isActive !== undefined) {
        const [row] = await db
          .select({ total: sql<number>`count(*)` })
          .from(sales)
          .where(eq(sales.isActive, filters.isActive));
        return Number(row?.total ?? 0);
      }
      const [row] = await db.select({ total: sql<number>`count(*)` }).from(sales);
      return Number(row?.total ?? 0);
    },

    async findPage(
      filters?: { isActive?: boolean },
      pagination?: { limit: number; offset: number },
    ): Promise<SaleRecord[]> {
      const limit = pagination?.limit ?? 20;
      const offset = pagination?.offset ?? 0;

      if (filters?.isActive !== undefined) {
        const rows = await db
          .select()
          .from(sales)
          .where(eq(sales.isActive, filters.isActive))
          .orderBy(desc(sales.createdAt))
          .limit(limit)
          .offset(offset);
        return rows.map(toSaleRecord);
      }
      const rows = await db
        .select()
        .from(sales)
        .orderBy(desc(sales.createdAt))
        .limit(limit)
        .offset(offset);
      return rows.map(toSaleRecord);
    },
  };
}
