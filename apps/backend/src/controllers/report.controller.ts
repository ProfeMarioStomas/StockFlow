import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import { getConfig } from "../config";
import { createDb } from "../db/client";
import { throwValidationError } from "../lib/validation";
import { ErrorResponseSchema } from "../models/common.model";
import {
  DateRangeQuerySchema,
  SalesSummaryResponseSchema,
  StockMovementResponseSchema,
  StockStatusQuerySchema,
  StockStatusResponseSchema,
  TopProductsQuerySchema,
  TopProductsResponseSchema,
} from "../models/report.model";
import { createReportService } from "../services/report.service";
import type { AppContext } from "../types";

const errorBody = (description: string) => ({
  content: { "application/json": { schema: ErrorResponseSchema } },
  description,
});

export const reportsRouter = new OpenAPIHono<AppContext>({
  defaultHook: (result, _c) => {
    if (!result.success) throwValidationError(result.error);
  },
});

// ── Route definitions ─────────────────────────────────────────────────────────

const salesSummaryRoute = createRoute({
  method: "get",
  path: "/sales-summary",
  tags: ["Reports"],
  summary: "Sales summary (revenue, count, avg ticket, payment breakdown)",
  request: { query: DateRangeQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: SalesSummaryResponseSchema } },
      description: "Sales summary data",
    },
    403: errorBody("Forbidden — admin only"),
  },
});

const topProductsRoute = createRoute({
  method: "get",
  path: "/top-products",
  tags: ["Reports"],
  summary: "Top products by revenue",
  request: { query: TopProductsQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: TopProductsResponseSchema } },
      description: "Top products list",
    },
    403: errorBody("Forbidden — admin only"),
  },
});

const stockStatusRoute = createRoute({
  method: "get",
  path: "/stock-status",
  tags: ["Reports"],
  summary: "Current stock status with critical alerts",
  request: { query: StockStatusQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: StockStatusResponseSchema } },
      description: "Stock status snapshot",
    },
    403: errorBody("Forbidden — admin only"),
  },
});

const stockMovementRoute = createRoute({
  method: "get",
  path: "/stock-movement",
  tags: ["Reports"],
  summary: "Stock movement (units in vs out) per product",
  request: { query: DateRangeQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: StockMovementResponseSchema } },
      description: "Stock movement data",
    },
    403: errorBody("Forbidden — admin only"),
  },
});

// ── Handlers ──────────────────────────────────────────────────────────────────

reportsRouter.openapi(salesSummaryRoute, async (c) => {
  if (c.get("user").role !== "admin") throw new HTTPException(403, { message: "Forbidden" });

  const { from, to } = c.req.valid("query");
  const config = getConfig(c.env);
  const service = createReportService(createDb(config.DATABASE_URL));
  return c.json(await service.getSalesSummary({ from, to }), 200);
});

reportsRouter.openapi(topProductsRoute, async (c) => {
  if (c.get("user").role !== "admin") throw new HTTPException(403, { message: "Forbidden" });

  const { from, to, limit } = c.req.valid("query");
  const config = getConfig(c.env);
  const service = createReportService(createDb(config.DATABASE_URL));
  return c.json(await service.getTopProducts({ from, to, limit }), 200);
});

reportsRouter.openapi(stockStatusRoute, async (c) => {
  if (c.get("user").role !== "admin") throw new HTTPException(403, { message: "Forbidden" });

  const { criticalOnly } = c.req.valid("query");
  const config = getConfig(c.env);
  const service = createReportService(createDb(config.DATABASE_URL));
  return c.json(await service.getStockStatus({ criticalOnly: criticalOnly === "true" }), 200);
});

reportsRouter.openapi(stockMovementRoute, async (c) => {
  if (c.get("user").role !== "admin") throw new HTTPException(403, { message: "Forbidden" });

  const { from, to } = c.req.valid("query");
  const config = getConfig(c.env);
  const service = createReportService(createDb(config.DATABASE_URL));
  return c.json(await service.getStockMovement({ from, to }), 200);
});
