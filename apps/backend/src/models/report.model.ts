import { z } from "@hono/zod-openapi";

// ── Shared date range query params ────────────────────────────────────────────

export const DateRangeQuerySchema = z.object({
  from: z.string().optional().openapi({
    example: "2024-01-01T00:00:00.000Z",
    description: "Start date (ISO 8601)",
  }),
  to: z.string().optional().openapi({
    example: "2024-12-31T23:59:59.999Z",
    description: "End date (ISO 8601)",
  }),
});

// ── Sales summary ─────────────────────────────────────────────────────────────

const PaymentMethodBreakdownSchema = z
  .object({
    method: z.enum(["cash", "card", "transfer"]).openapi({ example: "cash" }),
    count: z.number().openapi({ example: 80 }),
    revenue: z.string().openapi({ example: "8200.00" }),
  })
  .openapi("PaymentMethodBreakdown");

export const SalesSummaryResponseSchema = z
  .object({
    data: z.object({
      totalSales: z.number().openapi({ example: 142 }),
      totalRevenue: z.string().openapi({ example: "15420.50" }),
      avgTicket: z.string().openapi({ example: "108.59" }),
      byPaymentMethod: z.array(PaymentMethodBreakdownSchema),
    }),
  })
  .openapi("SalesSummaryResponse");

export type SalesSummaryResponse = z.infer<typeof SalesSummaryResponseSchema>;

// ── Top products ──────────────────────────────────────────────────────────────

export const TopProductsQuerySchema = DateRangeQuerySchema.extend({
  limit: z.coerce
    .number({ error: "Limit must be a number" })
    .int({ error: "Limit must be an integer" })
    .min(1, { error: "Limit must be at least 1" })
    .max(50, { error: "Limit cannot exceed 50" })
    .default(10)
    .openapi({ example: 10, description: "Number of top products to return (max: 50)" }),
});

const TopProductItemSchema = z
  .object({
    productId: z.uuid().openapi({ example: "00000000-0000-0000-0000-000000000001" }),
    productName: z.string().openapi({ example: "Widget A" }),
    barcode: z.string().openapi({ example: "123456" }),
    totalUnits: z.number().openapi({ example: 320 }),
    totalRevenue: z.string().openapi({ example: "6400.00" }),
  })
  .openapi("TopProductItem");

export const TopProductsResponseSchema = z
  .object({ data: z.array(TopProductItemSchema) })
  .openapi("TopProductsResponse");

export type TopProductsResponse = z.infer<typeof TopProductsResponseSchema>;

// ── Stock status ──────────────────────────────────────────────────────────────

export const StockStatusQuerySchema = z.object({
  criticalOnly: z.enum(["true", "false"]).optional().openapi({
    example: "false",
    description: "When true, return only products with stock <= criticalStock",
  }),
});

const StockStatusItemSchema = z
  .object({
    id: z.uuid().openapi({ example: "00000000-0000-0000-0000-000000000001" }),
    name: z.string().openapi({ example: "Widget A" }),
    barcode: z.string().openapi({ example: "123" }),
    stock: z.number().openapi({ example: 2 }),
    criticalStock: z.number().nullable().openapi({ example: 5 }),
    isCritical: z.boolean().openapi({ example: true }),
  })
  .openapi("StockStatusItem");

export const StockStatusResponseSchema = z
  .object({
    data: z.object({
      totalProducts: z.number().openapi({ example: 48 }),
      criticalCount: z.number().openapi({ example: 5 }),
      products: z.array(StockStatusItemSchema),
    }),
  })
  .openapi("StockStatusResponse");

export type StockStatusResponse = z.infer<typeof StockStatusResponseSchema>;

// ── Stock movement ────────────────────────────────────────────────────────────

const StockMovementItemSchema = z
  .object({
    productId: z.uuid().openapi({ example: "00000000-0000-0000-0000-000000000001" }),
    productName: z.string().openapi({ example: "Widget A" }),
    unitsIn: z.number().openapi({ example: 100 }),
    unitsOut: z.number().openapi({ example: 75 }),
    netMovement: z.number().openapi({ example: 25 }),
  })
  .openapi("StockMovementItem");

export const StockMovementResponseSchema = z
  .object({ data: z.array(StockMovementItemSchema) })
  .openapi("StockMovementResponse");

export type StockMovementResponse = z.infer<typeof StockMovementResponseSchema>;
