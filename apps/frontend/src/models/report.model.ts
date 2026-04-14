// TypeScript types matching backend report response shapes.
// These are read-only display types — no Zod schemas needed.

export type PaymentMethodBreakdown = {
  method: "cash" | "card" | "transfer";
  count: number;
  revenue: string;
};

export type SalesSummaryData = {
  totalSales: number;
  totalRevenue: string;
  avgTicket: string;
  byPaymentMethod: PaymentMethodBreakdown[];
};

export type SalesSummaryResponse = { data: SalesSummaryData };

export type TopProductItem = {
  productId: string;
  productName: string;
  barcode: string;
  totalUnits: number;
  totalRevenue: string;
};

export type TopProductsResponse = { data: TopProductItem[] };

export type StockStatusItem = {
  id: string;
  name: string;
  barcode: string;
  stock: number;
  criticalStock: number | null;
  isCritical: boolean;
};

export type StockStatusData = {
  totalProducts: number;
  criticalCount: number;
  products: StockStatusItem[];
};

export type StockStatusResponse = { data: StockStatusData };

export type StockMovementItem = {
  productId: string;
  productName: string;
  unitsIn: number;
  unitsOut: number;
  netMovement: number;
};

export type StockMovementResponse = { data: StockMovementItem[] };
