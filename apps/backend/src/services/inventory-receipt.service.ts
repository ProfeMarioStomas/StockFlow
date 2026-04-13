import { and, eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import type { Database } from "../db/client";
import { inventoryReceiptDetails, inventoryReceipts, products } from "../db/schema";
import { cache } from "../lib/cache";
import type { PaginatedResponse } from "../models/common.model";
import type {
  CreateInventoryReceiptInput,
  InventoryReceiptResponse,
  UpdateInventoryReceiptInput,
  UpdateReceiptDetailInput,
} from "../models/inventory-receipt.model";
import type {
  InventoryReceiptDetailRecord,
  InventoryReceiptRecord,
} from "../repositories/inventory-receipt.repository";
import { createInventoryReceiptRepository } from "../repositories/inventory-receipt.repository";

const TTL_5MIN = 5 * 60 * 1000;

// ── Private helpers ───────────────────────────────────────────────────────────

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

function composeReceipt(
  receiptRecord: InventoryReceiptRecord,
  detailRecords: InventoryReceiptDetailRecord[],
): InventoryReceiptResponse {
  return {
    ...receiptRecord,
    details: detailRecords,
  };
}

// ── Service type ──────────────────────────────────────────────────────────────

export type InventoryReceiptService = ReturnType<typeof createInventoryReceiptService>;

// ── Factory ───────────────────────────────────────────────────────────────────

export function createInventoryReceiptService(db: Database) {
  const repo = createInventoryReceiptRepository(db);

  return {
    async listReceipts(
      filters?: { isActive?: boolean },
      page = 1,
      pageSize = 20,
    ): Promise<PaginatedResponse<InventoryReceiptResponse>> {
      const [receiptRecords, total] = await Promise.all([
        repo.findPage(filters, { limit: pageSize, offset: (page - 1) * pageSize }),
        repo.count(filters),
      ]);
      const ids = receiptRecords.map((r) => r.id);
      const allDetails = await repo.findDetailsByReceiptIds(ids);

      const detailsByReceiptId = new Map<string, InventoryReceiptDetailRecord[]>();
      for (const detail of allDetails) {
        const list = detailsByReceiptId.get(detail.receiptId) ?? [];
        list.push(detail);
        detailsByReceiptId.set(detail.receiptId, list);
      }

      const data = receiptRecords.map((r) => composeReceipt(r, detailsByReceiptId.get(r.id) ?? []));
      return { data, meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
    },

    async getReceiptById(id: string): Promise<InventoryReceiptResponse> {
      const cached = cache.get<InventoryReceiptResponse>(`receipts:${id}`);
      if (cached) return cached;

      const record = await repo.findById(id);
      if (!record) {
        throw new HTTPException(404, { message: "Inventory receipt not found" });
      }

      const details = await repo.findDetailsByReceiptId(id);
      const result = composeReceipt(record, details);
      cache.set(`receipts:${id}`, result, TTL_5MIN);
      return result;
    },

    async createReceipt(
      input: CreateInventoryReceiptInput,
      receivedById: string,
    ): Promise<InventoryReceiptResponse> {
      // neon-http does not support db.transaction(). Multi-table writes use
      // db.batch() which Neon executes atomically in a single HTTP round-trip.

      // Validate products exist (parallel reads)
      const productChecks = await Promise.all(
        input.items.map((item) =>
          db.select().from(products).where(eq(products.id, item.productId)),
        ),
      );
      for (let i = 0; i < input.items.length; i++) {
        if (productChecks[i]!.length === 0) {
          throw new HTTPException(404, {
            message: `Product ${input.items[i]!.productId} not found`,
          });
        }
      }

      // Insert receipt header
      const [receiptRow] = await db
        .insert(inventoryReceipts)
        .values({ notes: input.notes ?? null, receivedById })
        .returning();

      // Insert details + update stock atomically via batch
      const batchResults = await db.batch([
        db
          .insert(inventoryReceiptDetails)
          .values(
            input.items.map((item) => ({
              receiptId: receiptRow!.id,
              productId: item.productId,
              quantity: item.quantity,
            })),
          )
          .returning(),
        ...input.items.map((item) =>
          db
            .update(products)
            .set({ stock: sql`${products.stock} + ${item.quantity}` })
            .where(eq(products.id, item.productId)),
        ),
      ] as const);

      const detailRows = batchResults[0] as (typeof inventoryReceiptDetails.$inferSelect)[];

      cache.invalidate("receipts:list");
      return composeReceipt(
        toInventoryReceiptRecord(receiptRow!),
        detailRows.map(toInventoryReceiptDetailRecord),
      );
    },

    async updateReceiptHeader(
      id: string,
      input: UpdateInventoryReceiptInput,
    ): Promise<InventoryReceiptResponse> {
      const existing = await repo.findById(id);
      if (!existing) {
        throw new HTTPException(404, { message: "Inventory receipt not found" });
      }

      const updateData: Partial<{ notes: string; isActive: boolean }> = {};
      if (input.notes !== undefined) updateData.notes = input.notes;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;

      const updated = await repo.updateHeader(id, updateData);
      if (!updated) {
        throw new HTTPException(404, { message: "Inventory receipt not found" });
      }

      const details = await repo.findDetailsByReceiptId(id);
      const result = composeReceipt(updated, details);

      cache.invalidate(`receipts:${id}`);
      cache.invalidate("receipts:list");
      return result;
    },

    async updateReceiptDetail(
      receiptId: string,
      detailId: string,
      input: UpdateReceiptDetailInput,
    ): Promise<InventoryReceiptResponse> {
      // neon-http does not support db.transaction().
      const existingRows = await db
        .select()
        .from(inventoryReceiptDetails)
        .where(
          and(
            eq(inventoryReceiptDetails.id, detailId),
            eq(inventoryReceiptDetails.receiptId, receiptId),
          ),
        );

      if (existingRows.length === 0) {
        throw new HTTPException(404, { message: "Receipt detail not found" });
      }

      const existing = existingRows[0]!;
      const oldQuantity = existing.quantity;
      const newQuantity = input.quantity ?? oldQuantity;
      const delta = newQuantity - oldQuantity;

      // Update detail + apply stock delta atomically via batch
      await db.batch([
        db
          .update(inventoryReceiptDetails)
          .set({ quantity: newQuantity })
          .where(eq(inventoryReceiptDetails.id, detailId)),
        db
          .update(products)
          .set({ stock: sql`${products.stock} + ${delta}` })
          .where(eq(products.id, existing.productId)),
      ] as const);

      // Fetch updated state for response
      const [allDetailRows, receiptRows] = await Promise.all([
        db
          .select()
          .from(inventoryReceiptDetails)
          .where(eq(inventoryReceiptDetails.receiptId, receiptId)),
        db.select().from(inventoryReceipts).where(eq(inventoryReceipts.id, receiptId)),
      ]);

      const receiptRow = receiptRows[0];
      if (!receiptRow) {
        throw new HTTPException(404, { message: "Inventory receipt not found" });
      }

      cache.invalidate(`receipts:${receiptId}`);
      cache.invalidate("receipts:list");

      return composeReceipt(
        toInventoryReceiptRecord(receiptRow),
        allDetailRows.map(toInventoryReceiptDetailRecord),
      );
    },

    async deleteReceipt(id: string): Promise<void> {
      // neon-http does not support db.transaction().
      const [receiptRows, detailRows] = await Promise.all([
        db.select().from(inventoryReceipts).where(eq(inventoryReceipts.id, id)),
        db.select().from(inventoryReceiptDetails).where(eq(inventoryReceiptDetails.receiptId, id)),
      ]);

      if (receiptRows.length === 0) {
        throw new HTTPException(404, { message: "Inventory receipt not found" });
      }

      // Soft-delete receipt + revert stock atomically via batch
      await db.batch([
        db.update(inventoryReceipts).set({ isActive: false }).where(eq(inventoryReceipts.id, id)),
        ...detailRows.map((detail) =>
          db
            .update(products)
            .set({ stock: sql`${products.stock} - ${detail.quantity}` })
            .where(eq(products.id, detail.productId)),
        ),
      ] as const);

      cache.invalidate(`receipts:${id}`);
      cache.invalidate("receipts:list");
    },
  };
}
