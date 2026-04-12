import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { getConfig } from "../config";
import { createDb } from "../db/client";
import { throwValidationError } from "../lib/validation";
import {
  ErrorResponseSchema,
  PaginationQuerySchema,
  paginatedSchema,
} from "../models/common.model";
import {
  CreateSaleSchema,
  SaleResponseSchema,
  UpdateSaleDetailSchema,
  UpdateSaleHeaderSchema,
} from "../models/sale.model";
import { createSaleService } from "../services/sale.service";
import type { AppContext } from "../types";

// ── Shared schemas ────────────────────────────────────────────────────────────

const SaleIdParamSchema = z.object({
  id: z.uuid().openapi({ example: "00000000-0000-0000-0000-000000000001" }),
});

const DetailParamSchema = z.object({
  saleId: z.uuid().openapi({ example: "00000000-0000-0000-0000-000000000001" }),
  detailId: z.uuid().openapi({ example: "00000000-0000-0000-0000-000000000002" }),
});

const ListSalesQuerySchema = PaginationQuerySchema.extend({
  isActive: z
    .enum(["true", "false"])
    .optional()
    .openapi({ example: "true", description: "Filter sales by active status" }),
});

const PaginatedSalesSchema = paginatedSchema(SaleResponseSchema).openapi("PaginatedSales");

// ── Error response shorthand ──────────────────────────────────────────────────

const errorBody = (description: string) => ({
  content: { "application/json": { schema: ErrorResponseSchema } },
  description,
});

// ── Router ────────────────────────────────────────────────────────────────────

export const salesRouter = new OpenAPIHono<AppContext>({
  defaultHook: (result, _c) => {
    if (!result.success) throwValidationError(result.error);
  },
});

// ── Route definitions ─────────────────────────────────────────────────────────

const listSalesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Sales"],
  summary: "List sales (paginated)",
  request: { query: ListSalesQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: PaginatedSalesSchema } },
      description: "Returns a paginated list of sales with embedded details",
    },
  },
});

const getSaleRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Sales"],
  summary: "Get a sale by ID",
  request: { params: SaleIdParamSchema },
  responses: {
    200: {
      content: { "application/json": { schema: SaleResponseSchema } },
      description: "Sale found",
    },
    404: errorBody("Sale not found"),
  },
});

const createSaleRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Sales"],
  summary: "Create a new sale",
  request: {
    body: {
      content: { "application/json": { schema: CreateSaleSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: SaleResponseSchema } },
      description: "Sale created",
    },
    400: errorBody("Validation error"),
    404: errorBody("Product not found"),
    409: errorBody("Insufficient stock"),
  },
});

const updateSaleRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Sales"],
  summary: "Update sale header (paymentMethod, isActive)",
  request: {
    params: SaleIdParamSchema,
    body: {
      content: { "application/json": { schema: UpdateSaleHeaderSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SaleResponseSchema } },
      description: "Sale updated",
    },
    400: errorBody("Validation error"),
    404: errorBody("Sale not found"),
  },
});

const updateSaleDetailRoute = createRoute({
  method: "put",
  path: "/{saleId}/details/{detailId}",
  tags: ["Sales"],
  summary: "Update a sale detail (quantity, unitPrice) — recalculates totalAmount",
  request: {
    params: DetailParamSchema,
    body: {
      content: { "application/json": { schema: UpdateSaleDetailSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SaleResponseSchema } },
      description: "Detail updated, totalAmount recalculated",
    },
    400: errorBody("Validation error"),
    404: errorBody("Sale or detail not found"),
  },
});

const deleteSaleRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Sales"],
  summary: "Soft-delete a sale and revert stock",
  request: { params: SaleIdParamSchema },
  responses: {
    204: { description: "Sale deleted, stock reverted" },
    404: errorBody("Sale not found"),
  },
});

// ── Handlers ──────────────────────────────────────────────────────────────────

salesRouter.openapi(listSalesRoute, async (c) => {
  const { isActive, page, pageSize } = c.req.valid("query");
  const config = getConfig(c.env);
  const db = createDb(config.DATABASE_URL);
  const service = createSaleService(db);

  const filters = isActive !== undefined ? { isActive: isActive === "true" } : undefined;
  const result = await service.listSales(filters, page, pageSize);
  return c.json(result, 200);
});

salesRouter.openapi(getSaleRoute, async (c) => {
  const { id } = c.req.valid("param");
  const config = getConfig(c.env);
  const db = createDb(config.DATABASE_URL);
  const service = createSaleService(db);
  const sale = await service.getSaleById(id);
  return c.json(sale, 200);
});

salesRouter.openapi(createSaleRoute, async (c) => {
  const body = c.req.valid("json");
  const { sub: sellerId } = c.get("user");
  const config = getConfig(c.env);
  const db = createDb(config.DATABASE_URL);
  const service = createSaleService(db);
  const sale = await service.createSale(body, sellerId);
  return c.json(sale, 201);
});

salesRouter.openapi(updateSaleRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const config = getConfig(c.env);
  const db = createDb(config.DATABASE_URL);
  const service = createSaleService(db);
  const sale = await service.updateSaleHeader(id, body);
  return c.json(sale, 200);
});

salesRouter.openapi(updateSaleDetailRoute, async (c) => {
  const { saleId, detailId } = c.req.valid("param");
  const body = c.req.valid("json");
  const config = getConfig(c.env);
  const db = createDb(config.DATABASE_URL);
  const service = createSaleService(db);
  const sale = await service.updateSaleDetail(saleId, detailId, body);
  return c.json(sale, 200);
});

salesRouter.openapi(deleteSaleRoute, async (c) => {
  const { id } = c.req.valid("param");
  const config = getConfig(c.env);
  const db = createDb(config.DATABASE_URL);
  const service = createSaleService(db);
  await service.deleteSale(id);
  return c.body(null, 204);
});
