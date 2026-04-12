import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "../db/client";
import { inventoryReceiptDetails, inventoryReceipts } from "../db/schema";

// ── Domain types ──────────────────────────────────────────────────────────────

export type InventoryReceiptRecord = {
  id: string;
  notes: string | null;
  receivedById: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type InventoryReceiptDetailRecord = {
  id: string;
  receiptId: string;
  productId: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
};

// ── Mappers ───────────────────────────────────────────────────────────────────

function toInventoryReceiptRecord(
  row: typeof inventoryReceipts.$inferSelect,
): InventoryReceiptRecord {
  return {
    id: row.id,
    notes: row.notes ?? null,
    receivedById: row.receivedById,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toInventoryReceiptDetailRecord(
  row: typeof inventoryReceiptDetails.$inferSelect,
): InventoryReceiptDetailRecord {
  return {
    id: row.id,
    receiptId: row.receiptId,
    productId: row.productId,
    quantity: row.quantity,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ── Repository type ───────────────────────────────────────────────────────────

export type InventoryReceiptRepository = ReturnType<typeof createInventoryReceiptRepository>;

// ── Factory ───────────────────────────────────────────────────────────────────

export function createInventoryReceiptRepository(db: Database) {
  return {
    async findAll(filters?: { isActive?: boolean }): Promise<InventoryReceiptRecord[]> {
      if (filters?.isActive !== undefined) {
        const rows = await db
          .select()
          .from(inventoryReceipts)
          .where(eq(inventoryReceipts.isActive, filters.isActive));
        return rows.map(toInventoryReceiptRecord);
      }
      const rows = await db.select().from(inventoryReceipts);
      return rows.map(toInventoryReceiptRecord);
    },

    async findById(id: string): Promise<InventoryReceiptRecord | undefined> {
      const rows = await db.select().from(inventoryReceipts).where(eq(inventoryReceipts.id, id));
      return rows[0] ? toInventoryReceiptRecord(rows[0]) : undefined;
    },

    async findDetailsByReceiptId(receiptId: string): Promise<InventoryReceiptDetailRecord[]> {
      const rows = await db
        .select()
        .from(inventoryReceiptDetails)
        .where(eq(inventoryReceiptDetails.receiptId, receiptId));
      return rows.map(toInventoryReceiptDetailRecord);
    },

    async findDetailsByReceiptIds(ids: string[]): Promise<InventoryReceiptDetailRecord[]> {
      if (ids.length === 0) return [];
      const rows = await db
        .select()
        .from(inventoryReceiptDetails)
        .where(inArray(inventoryReceiptDetails.receiptId, ids));
      return rows.map(toInventoryReceiptDetailRecord);
    },

    async findDetailById(
      receiptId: string,
      detailId: string,
    ): Promise<InventoryReceiptDetailRecord | undefined> {
      const rows = await db
        .select()
        .from(inventoryReceiptDetails)
        .where(
          and(
            eq(inventoryReceiptDetails.id, detailId),
            eq(inventoryReceiptDetails.receiptId, receiptId),
          ),
        );
      return rows[0] ? toInventoryReceiptDetailRecord(rows[0]) : undefined;
    },

    async updateHeader(
      id: string,
      data: Partial<{ notes: string; isActive: boolean }>,
    ): Promise<InventoryReceiptRecord | undefined> {
      const updateData: Record<string, unknown> = {};
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      const rows = await db
        .update(inventoryReceipts)
        .set(updateData)
        .where(eq(inventoryReceipts.id, id))
        .returning();
      return rows[0] ? toInventoryReceiptRecord(rows[0]) : undefined;
    },

    async updateDetail(
      detailId: string,
      data: Partial<{ quantity: number }>,
    ): Promise<InventoryReceiptDetailRecord | undefined> {
      const updateData: Record<string, unknown> = {};
      if (data.quantity !== undefined) updateData.quantity = data.quantity;

      const rows = await db
        .update(inventoryReceiptDetails)
        .set(updateData)
        .where(eq(inventoryReceiptDetails.id, detailId))
        .returning();
      return rows[0] ? toInventoryReceiptDetailRecord(rows[0]) : undefined;
    },

    async softDelete(id: string): Promise<InventoryReceiptRecord | undefined> {
      const rows = await db
        .update(inventoryReceipts)
        .set({ isActive: false })
        .where(eq(inventoryReceipts.id, id))
        .returning();
      return rows[0] ? toInventoryReceiptRecord(rows[0]) : undefined;
    },

    async count(filters?: { isActive?: boolean }): Promise<number> {
      if (filters?.isActive !== undefined) {
        const [row] = await db
          .select({ total: sql<number>`count(*)` })
          .from(inventoryReceipts)
          .where(eq(inventoryReceipts.isActive, filters.isActive));
        return Number(row?.total ?? 0);
      }
      const [row] = await db.select({ total: sql<number>`count(*)` }).from(inventoryReceipts);
      return Number(row?.total ?? 0);
    },

    async findPage(
      filters?: { isActive?: boolean },
      pagination?: { limit: number; offset: number },
    ): Promise<InventoryReceiptRecord[]> {
      const limit = pagination?.limit ?? 20;
      const offset = pagination?.offset ?? 0;

      if (filters?.isActive !== undefined) {
        const rows = await db
          .select()
          .from(inventoryReceipts)
          .where(eq(inventoryReceipts.isActive, filters.isActive))
          .orderBy(desc(inventoryReceipts.createdAt))
          .limit(limit)
          .offset(offset);
        return rows.map(toInventoryReceiptRecord);
      }
      const rows = await db
        .select()
        .from(inventoryReceipts)
        .orderBy(desc(inventoryReceipts.createdAt))
        .limit(limit)
        .offset(offset);
      return rows.map(toInventoryReceiptRecord);
    },
  };
}
