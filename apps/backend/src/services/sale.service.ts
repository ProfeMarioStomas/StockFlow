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
      return db.transaction(async (tx) => {
        // Validate each item: product must exist and have sufficient stock
        for (const item of input.items) {
          const productRows = await tx
            .select()
            .from(products)
            .where(eq(products.id, item.productId));

          if (productRows.length === 0) {
            throw new HTTPException(404, {
              message: `Product ${item.productId} not found`,
            });
          }

          const product = productRows[0]!;
          if (product.stock < item.quantity) {
            throw new HTTPException(409, {
              message: `Insufficient stock for product ${item.productId}`,
            });
          }
        }

        // Calculate total
        const totalAmount = input.items.reduce(
          (sum, item) => sum + item.quantity * item.unitPrice,
          0,
        );

        // Insert sale
        const [saleRow] = await tx
          .insert(sales)
          .values({
            totalAmount: String(totalAmount),
            paymentMethod: input.paymentMethod,
            sellerId,
          })
          .returning();

        // Insert sale details
        const detailRows = await tx
          .insert(saleDetails)
          .values(
            input.items.map((item) => ({
              saleId: saleRow!.id,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: String(item.unitPrice),
            })),
          )
          .returning();

        // Decrement stock per product
        for (const item of input.items) {
          await tx
            .update(products)
            .set({ stock: sql`${products.stock} - ${item.quantity}` })
            .where(eq(products.id, item.productId));
        }

        cache.invalidate("sales:list");
        return composeSale(toSaleRecord(saleRow!), detailRows.map(toSaleDetailRecord));
      });
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
      return db.transaction(async (tx) => {
        // Check detail exists and belongs to sale
        const existingRows = await tx
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

        // Update the detail
        await tx
          .update(saleDetails)
          .set(updateData)
          .where(eq(saleDetails.id, detailId))
          .returning();

        // Fetch all details after update to recalculate total
        const allDetailRows = await tx
          .select()
          .from(saleDetails)
          .where(eq(saleDetails.saleId, saleId));

        const newTotal = allDetailRows.reduce(
          (sum, d) => sum + d.quantity * parseFloat(d.unitPrice),
          0,
        );

        // Update sale totalAmount
        const [updatedSaleRow] = await tx
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
      });
    },

    async deleteSale(id: string): Promise<void> {
      await db.transaction(async (tx) => {
        // Check sale exists
        const saleRows = await tx.select().from(sales).where(eq(sales.id, id));
        if (saleRows.length === 0) {
          throw new HTTPException(404, { message: "Sale not found" });
        }

        // Get all details to revert stock
        const detailRows = await tx.select().from(saleDetails).where(eq(saleDetails.saleId, id));

        // Soft-delete the sale
        await tx.update(sales).set({ isActive: false }).where(eq(sales.id, id));

        // Revert stock per product
        for (const detail of detailRows) {
          await tx
            .update(products)
            .set({ stock: sql`${products.stock} + ${detail.quantity}` })
            .where(eq(products.id, detail.productId));
        }

        cache.invalidate(`sales:${id}`);
        cache.invalidate("sales:list");
      });
    },
  };
}
