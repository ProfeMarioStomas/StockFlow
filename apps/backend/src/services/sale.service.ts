import { and, eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import type { Database } from "../db/client";
import { products, saleDetails, sales } from "../db/schema";
import { cache } from "../lib/cache";
import type { PaginatedResponse } from "../models/common.model";
import type {
  CreateSaleInput,
  SaleResponse,
  UpdateSaleDetailInput,
  UpdateSaleHeaderInput,
} from "../models/sale.model";
import type { SaleDetailRecord, SaleRecord } from "../repositories/sale.repository";
import { createSaleRepository } from "../repositories/sale.repository";

const TTL_5MIN = 5 * 60 * 1000;

// ── Private helpers ───────────────────────────────────────────────────────────

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

function composeSale(saleRecord: SaleRecord, detailRecords: SaleDetailRecord[]): SaleResponse {
  return {
    ...saleRecord,
    details: detailRecords,
  };
}

// ── Service type ──────────────────────────────────────────────────────────────

export type SaleService = ReturnType<typeof createSaleService>;

// ── Factory ───────────────────────────────────────────────────────────────────

export function createSaleService(db: Database) {
  const repo = createSaleRepository(db);

  return {
    async listSales(
      filters?: { isActive?: boolean },
      page = 1,
      pageSize = 20,
    ): Promise<PaginatedResponse<SaleResponse>> {
      const [saleRecords, total] = await Promise.all([
        repo.findPage(filters, { limit: pageSize, offset: (page - 1) * pageSize }),
        repo.count(filters),
      ]);
      const ids = saleRecords.map((s) => s.id);
      const allDetails = await repo.findDetailsBySaleIds(ids);

      const detailsBySaleId = new Map<string, SaleDetailRecord[]>();
      for (const detail of allDetails) {
        const list = detailsBySaleId.get(detail.saleId) ?? [];
        list.push(detail);
        detailsBySaleId.set(detail.saleId, list);
      }

      const data = saleRecords.map((s) => composeSale(s, detailsBySaleId.get(s.id) ?? []));
      return { data, meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
    },

    async getSaleById(id: string): Promise<SaleResponse> {
      const cached = cache.get<SaleResponse>(`sales:${id}`);
      if (cached) return cached;

      const record = await repo.findById(id);
      if (!record) {
        throw new HTTPException(404, { message: "Sale not found" });
      }

      const details = await repo.findDetailsBySaleId(id);
      const result = composeSale(record, details);
      cache.set(`sales:${id}`, result, TTL_5MIN);
      return result;
    },

    async createSale(input: CreateSaleInput, sellerId: string): Promise<SaleResponse> {
      // neon-http does not support db.transaction(). Multi-table writes use
      // db.batch() which Neon executes atomically in a single HTTP round-trip.

      // Validate products exist and have sufficient stock (parallel reads)
      const productChecks = await Promise.all(
        input.items.map((item) =>
          db.select().from(products).where(eq(products.id, item.productId)),
        ),
      );
      for (let i = 0; i < input.items.length; i++) {
        const rows = productChecks[i]!;
        if (rows.length === 0) {
          throw new HTTPException(404, {
            message: `Product ${input.items[i]!.productId} not found`,
          });
        }
        const product = rows[0]!;
        if (product.stock < input.items[i]!.quantity) {
          throw new HTTPException(409, {
            message: `Insufficient stock for product ${input.items[i]!.productId}`,
          });
        }
      }

      // Calculate total
      const totalAmount = input.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0,
      );

      // Insert sale header
      const [saleRow] = await db
        .insert(sales)
        .values({ totalAmount: String(totalAmount), paymentMethod: input.paymentMethod, sellerId })
        .returning();

      // Insert details + decrement stock atomically via batch
      const batchResults = await db.batch([
        db
          .insert(saleDetails)
          .values(
            input.items.map((item) => ({
              saleId: saleRow!.id,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: String(item.unitPrice),
            })),
          )
          .returning(),
        ...input.items.map((item) =>
          db
            .update(products)
            .set({ stock: sql`${products.stock} - ${item.quantity}` })
            .where(eq(products.id, item.productId)),
        ),
      ] as const);

      const detailRows = batchResults[0] as (typeof saleDetails.$inferSelect)[];

      cache.invalidate("sales:list");
      return composeSale(toSaleRecord(saleRow!), detailRows.map(toSaleDetailRecord));
    },

    async updateSaleHeader(id: string, input: UpdateSaleHeaderInput): Promise<SaleResponse> {
      const existing = await repo.findById(id);
      if (!existing) {
        throw new HTTPException(404, { message: "Sale not found" });
      }

      const updateData: Partial<{
        paymentMethod: "cash" | "card" | "transfer";
        isActive: boolean;
      }> = {};
      if (input.paymentMethod !== undefined) updateData.paymentMethod = input.paymentMethod;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;

      const updated = await repo.updateHeader(id, updateData);
      if (!updated) {
        throw new HTTPException(404, { message: "Sale not found" });
      }

      const details = await repo.findDetailsBySaleId(id);
      const result = composeSale(updated, details);

      cache.invalidate(`sales:${id}`);
      cache.invalidate("sales:list");
      return result;
    },

    async updateSaleDetail(
      saleId: string,
      detailId: string,
      input: UpdateSaleDetailInput,
    ): Promise<SaleResponse> {
      // neon-http does not support db.transaction().
      const existingRows = await db
        .select()
        .from(saleDetails)
        .where(and(eq(saleDetails.id, detailId), eq(saleDetails.saleId, saleId)));

      if (existingRows.length === 0) {
        throw new HTTPException(404, { message: "Sale detail not found" });
      }

      // Build update payload
      const updateData: Record<string, unknown> = {};
      if (input.quantity !== undefined) updateData.quantity = input.quantity;
      if (input.unitPrice !== undefined) updateData.unitPrice = String(input.unitPrice);

      // Apply update
      await db.update(saleDetails).set(updateData).where(eq(saleDetails.id, detailId));

      // Fetch all details after update to recalculate total
      const allDetailRows = await db
        .select()
        .from(saleDetails)
        .where(eq(saleDetails.saleId, saleId));

      const newTotal = allDetailRows.reduce(
        (sum, d) => sum + d.quantity * parseFloat(d.unitPrice),
        0,
      );

      // Update sale total
      const [updatedSaleRow] = await db
        .update(sales)
        .set({ totalAmount: String(newTotal) })
        .where(eq(sales.id, saleId))
        .returning();

      cache.invalidate(`sales:${saleId}`);
      cache.invalidate("sales:list");

      if (!updatedSaleRow) {
        throw new HTTPException(404, { message: "Sale not found" });
      }
      return composeSale(toSaleRecord(updatedSaleRow), allDetailRows.map(toSaleDetailRecord));
    },

    async deleteSale(id: string): Promise<void> {
      // neon-http does not support db.transaction().
      const [saleRows, detailRows] = await Promise.all([
        db.select().from(sales).where(eq(sales.id, id)),
        db.select().from(saleDetails).where(eq(saleDetails.saleId, id)),
      ]);

      if (saleRows.length === 0) {
        throw new HTTPException(404, { message: "Sale not found" });
      }

      // Soft-delete sale + revert stock atomically via batch
      await db.batch([
        db.update(sales).set({ isActive: false }).where(eq(sales.id, id)),
        ...detailRows.map((detail) =>
          db
            .update(products)
            .set({ stock: sql`${products.stock} + ${detail.quantity}` })
            .where(eq(products.id, detail.productId)),
        ),
      ] as const);

      cache.invalidate(`sales:${id}`);
      cache.invalidate("sales:list");
    },
  };
}
