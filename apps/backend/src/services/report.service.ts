import type { Database } from "../db/client";
import { cache } from "../lib/cache";
import type {
  SalesSummaryResponse,
  StockMovementResponse,
  StockStatusResponse,
  TopProductsResponse,
} from "../models/report.model";
import { createReportRepository } from "../repositories/report.repository";

const TTL_5MIN = 5 * 60 * 1000;

export type ReportService = ReturnType<typeof createReportService>;

export function createReportService(db: Database) {
  const repo = createReportRepository(db);

  return {
    async getSalesSummary(params: {
      from?: string | undefined;
      to?: string | undefined;
    }): Promise<SalesSummaryResponse> {
      const key = `reports:sales-summary:${params.from ?? ""}:${params.to ?? ""}`;
      const cached = cache.get<SalesSummaryResponse>(key);
      if (cached) return cached;

      const { totals, byMethod } = await repo.getSalesSummary(params);

      const totalSales = Number(totals.totalSales);
      const totalRevenue = parseFloat(totals.totalRevenue).toFixed(2);
      const avgTicket =
        totalSales > 0 ? (parseFloat(totals.totalRevenue) / totalSales).toFixed(2) : "0.00";

      const result: SalesSummaryResponse = {
        data: {
          totalSales,
          totalRevenue,
          avgTicket,
          byPaymentMethod: byMethod.map((row) => ({
            method: row.method,
            count: Number(row.count),
            revenue: parseFloat(row.revenue).toFixed(2),
          })),
        },
      };

      cache.set(key, result, TTL_5MIN);
      return result;
    },

    async getTopProducts(params: {
      from?: string | undefined;
      to?: string | undefined;
      limit: number;
    }): Promise<TopProductsResponse> {
      const key = `reports:top-products:${params.from ?? ""}:${params.to ?? ""}:${params.limit}`;
      const cached = cache.get<TopProductsResponse>(key);
      if (cached) return cached;

      const rows = await repo.getTopProducts(params);

      const result: TopProductsResponse = {
        data: rows.map((row) => ({
          productId: row.productId,
          productName: row.productName,
          barcode: row.barcode,
          totalUnits: Number(row.totalUnits),
          totalRevenue: parseFloat(row.totalRevenue).toFixed(2),
        })),
      };

      cache.set(key, result, TTL_5MIN);
      return result;
    },

    async getStockStatus(params: { criticalOnly?: boolean }): Promise<StockStatusResponse> {
      const key = `reports:stock-status:${params.criticalOnly ? "critical" : "all"}`;
      const cached = cache.get<StockStatusResponse>(key);
      if (cached) return cached;

      const rows = await repo.getStockStatus(params);

      const productList = rows.map((row) => ({
        id: row.id,
        name: row.name,
        barcode: row.barcode,
        stock: row.stock,
        criticalStock: row.criticalStock,
        isCritical: row.criticalStock !== null && row.stock <= row.criticalStock,
      }));

      const result: StockStatusResponse = {
        data: {
          totalProducts: productList.length,
          criticalCount: productList.filter((p) => p.isCritical).length,
          products: productList,
        },
      };

      cache.set(key, result, TTL_5MIN);
      return result;
    },

    async getStockMovement(params: {
      from?: string | undefined;
      to?: string | undefined;
    }): Promise<StockMovementResponse> {
      const key = `reports:stock-movement:${params.from ?? ""}:${params.to ?? ""}`;
      const cached = cache.get<StockMovementResponse>(key);
      if (cached) return cached;

      const { inRows, outRows, allProducts } = await repo.getStockMovement(params);

      const productNameMap = new Map(allProducts.map((p) => [p.id, p.name]));
      const inMap = new Map(inRows.map((r) => [r.productId, Number(r.units)]));
      const outMap = new Map(outRows.map((r) => [r.productId, Number(r.units)]));

      const allProductIds = new Set([...inMap.keys(), ...outMap.keys()]);

      const data = Array.from(allProductIds)
        .map((productId) => {
          const unitsIn = inMap.get(productId) ?? 0;
          const unitsOut = outMap.get(productId) ?? 0;
          return {
            productId,
            productName: productNameMap.get(productId) ?? "Unknown",
            unitsIn,
            unitsOut,
            netMovement: unitsIn - unitsOut,
          };
        })
        .sort((a, b) => b.unitsIn + b.unitsOut - (a.unitsIn + a.unitsOut));

      const result: StockMovementResponse = { data };

      cache.set(key, result, TTL_5MIN);
      return result;
    },
  };
}
