import { and, asc, desc, eq, gte, isNotNull, lte, sql } from "drizzle-orm";
import type { Database } from "../db/client";
import {
  inventoryReceiptDetails,
  inventoryReceipts,
  products,
  saleDetails,
  sales,
} from "../db/schema";

export type ReportRepository = ReturnType<typeof createReportRepository>;

export function createReportRepository(db: Database) {
  return {
    async getSalesSummary(params: { from?: string | undefined; to?: string | undefined }) {
      const conditions = [eq(sales.isActive, true)];
      if (params.from) conditions.push(gte(sales.createdAt, new Date(params.from)));
      if (params.to) conditions.push(lte(sales.createdAt, new Date(params.to)));

      const where = and(...conditions);

      const [totalsResult, byMethodResult] = await Promise.all([
        db
          .select({
            totalSales: sql<string>`count(*)`,
            totalRevenue: sql<string>`coalesce(sum(${sales.totalAmount}), '0')`,
          })
          .from(sales)
          .where(where),
        db
          .select({
            method: sales.paymentMethod,
            count: sql<string>`count(*)`,
            revenue: sql<string>`coalesce(sum(${sales.totalAmount}), '0')`,
          })
          .from(sales)
          .where(where)
          .groupBy(sales.paymentMethod),
      ]);

      return { totals: totalsResult[0]!, byMethod: byMethodResult };
    },

    async getTopProducts(params: { from?: string | undefined; to?: string | undefined; limit: number }) {
      const conditions = [eq(sales.isActive, true)];
      if (params.from) conditions.push(gte(sales.createdAt, new Date(params.from)));
      if (params.to) conditions.push(lte(sales.createdAt, new Date(params.to)));

      const totalRevenueSql = sql<string>`sum(${saleDetails.quantity} * ${saleDetails.unitPrice})`;

      return db
        .select({
          productId: products.id,
          productName: products.name,
          barcode: products.barcode,
          totalUnits: sql<string>`sum(${saleDetails.quantity})`,
          totalRevenue: totalRevenueSql,
        })
        .from(saleDetails)
        .innerJoin(sales, eq(saleDetails.saleId, sales.id))
        .innerJoin(products, eq(saleDetails.productId, products.id))
        .where(and(...conditions))
        .groupBy(products.id, products.name, products.barcode)
        .orderBy(desc(totalRevenueSql))
        .limit(params.limit);
    },

    async getStockStatus(params: { criticalOnly?: boolean }) {
      const conditions = [eq(products.isActive, true)];
      if (params.criticalOnly) {
        conditions.push(isNotNull(products.criticalStock));
        conditions.push(sql`${products.stock} <= ${products.criticalStock}`);
      }

      return db
        .select({
          id: products.id,
          name: products.name,
          barcode: products.barcode,
          stock: products.stock,
          criticalStock: products.criticalStock,
        })
        .from(products)
        .where(and(...conditions))
        .orderBy(
          asc(
            sql`CASE WHEN ${products.criticalStock} IS NOT NULL AND ${products.stock} <= ${products.criticalStock} THEN 0 ELSE 1 END`,
          ),
          asc(products.stock),
        );
    },

    async getStockMovement(params: { from?: string | undefined; to?: string | undefined }) {
      const inConditions = [eq(inventoryReceipts.isActive, true)];
      if (params.from) inConditions.push(gte(inventoryReceipts.createdAt, new Date(params.from)));
      if (params.to) inConditions.push(lte(inventoryReceipts.createdAt, new Date(params.to)));

      const outConditions = [eq(sales.isActive, true)];
      if (params.from) outConditions.push(gte(sales.createdAt, new Date(params.from)));
      if (params.to) outConditions.push(lte(sales.createdAt, new Date(params.to)));

      const [inRows, outRows, allProducts] = await Promise.all([
        db
          .select({
            productId: inventoryReceiptDetails.productId,
            units: sql<string>`sum(${inventoryReceiptDetails.quantity})`,
          })
          .from(inventoryReceiptDetails)
          .innerJoin(inventoryReceipts, eq(inventoryReceiptDetails.receiptId, inventoryReceipts.id))
          .where(and(...inConditions))
          .groupBy(inventoryReceiptDetails.productId),
        db
          .select({
            productId: saleDetails.productId,
            units: sql<string>`sum(${saleDetails.quantity})`,
          })
          .from(saleDetails)
          .innerJoin(sales, eq(saleDetails.saleId, sales.id))
          .where(and(...outConditions))
          .groupBy(saleDetails.productId),
        db
          .select({ id: products.id, name: products.name })
          .from(products)
          .where(eq(products.isActive, true)),
      ]);

      return { inRows, outRows, allProducts };
    },
  };
}
