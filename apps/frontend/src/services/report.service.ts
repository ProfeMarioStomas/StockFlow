import type {
  SalesSummaryResponse,
  StockMovementResponse,
  StockStatusResponse,
  TopProductsResponse,
} from "../models/report.model";
import { api } from "./api";

export const reportService = {
  getSalesSummary: (params: { from?: string | undefined; to?: string | undefined }) =>
    api.get<SalesSummaryResponse>("/reports/sales-summary", { params }).then((r) => r.data),

  getTopProducts: (params: { from?: string | undefined; to?: string | undefined; limit?: number }) =>
    api.get<TopProductsResponse>("/reports/top-products", { params }).then((r) => r.data),

  getStockStatus: (params?: { criticalOnly?: boolean }) =>
    api.get<StockStatusResponse>("/reports/stock-status", { params }).then((r) => r.data),

  getStockMovement: (params?: { from?: string | undefined; to?: string | undefined }) =>
    api.get<StockMovementResponse>("/reports/stock-movement", { params }).then((r) => r.data),
};
