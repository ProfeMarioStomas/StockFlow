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
  CreateInventoryReceiptSchema,
  InventoryReceiptResponseSchema,
  UpdateInventoryReceiptSchema,
  UpdateReceiptDetailSchema,
} from "../models/inventory-receipt.model";
import { createInventoryReceiptService } from "../services/inventory-receipt.service";
import type { AppContext } from "../types";

// ── Shared schemas ────────────────────────────────────────────────────────────

const ReceiptIdParamSchema = z.object({
  id: z.uuid().openapi({ example: "00000000-0000-0000-0000-000000000001" }),
});

const DetailParamSchema = z.object({
  receiptId: z.uuid().openapi({ example: "00000000-0000-0000-0000-000000000001" }),
  detailId: z.uuid().openapi({ example: "00000000-0000-0000-0000-000000000002" }),
});

const ListReceiptsQuerySchema = PaginationQuerySchema.extend({
  isActive: z
    .enum(["true", "false"])
    .optional()
    .openapi({ example: "true", description: "Filter receipts by active status" }),
});

const PaginatedReceiptsSchema = paginatedSchema(InventoryReceiptResponseSchema).openapi(
  "PaginatedInventoryReceipts",
);

// ── Error response shorthand ──────────────────────────────────────────────────

const errorBody = (description: string) => ({
  content: { "application/json": { schema: ErrorResponseSchema } },
  description,
});

// ── Router ────────────────────────────────────────────────────────────────────

export const inventoryReceiptsRouter = new OpenAPIHono<AppContext>({
  defaultHook: (result, _c) => {
    if (!result.success) throwValidationError(result.error);
  },
});

// ── Route definitions ─────────────────────────────────────────────────────────

const listReceiptsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Inventory Receipts"],
  summary: "List inventory receipts (paginated)",
  request: { query: ListReceiptsQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: PaginatedReceiptsSchema } },
      description: "Returns a paginated list of inventory receipts with embedded details",
    },
  },
});

const getReceiptRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Inventory Receipts"],
  summary: "Get an inventory receipt by ID",
  request: { params: ReceiptIdParamSchema },
  responses: {
    200: {
      content: { "application/json": { schema: InventoryReceiptResponseSchema } },
      description: "Inventory receipt found",
    },
    404: errorBody("Inventory receipt not found"),
  },
});

const createReceiptRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Inventory Receipts"],
  summary: "Create a new inventory receipt and increment stock",
  request: {
    body: {
      content: { "application/json": { schema: CreateInventoryReceiptSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: InventoryReceiptResponseSchema } },
      description: "Inventory receipt created, stock incremented",
    },
    400: errorBody("Validation error"),
    404: errorBody("Product not found"),
  },
});

const updateReceiptRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Inventory Receipts"],
  summary: "Update inventory receipt header (notes, isActive)",
  request: {
    params: ReceiptIdParamSchema,
    body: {
      content: { "application/json": { schema: UpdateInventoryReceiptSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: InventoryReceiptResponseSchema } },
      description: "Inventory receipt updated",
    },
    400: errorBody("Validation error"),
    404: errorBody("Inventory receipt not found"),
  },
});

const updateReceiptDetailRoute = createRoute({
  method: "put",
  path: "/{receiptId}/details/{detailId}",
  tags: ["Inventory Receipts"],
  summary: "Update a receipt detail quantity — adjusts stock by delta",
  request: {
    params: DetailParamSchema,
    body: {
      content: { "application/json": { schema: UpdateReceiptDetailSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: InventoryReceiptResponseSchema } },
      description: "Detail updated, stock adjusted by delta",
    },
    400: errorBody("Validation error"),
    404: errorBody("Inventory receipt or detail not found"),
  },
});

const deleteReceiptRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Inventory Receipts"],
  summary: "Soft-delete an inventory receipt and revert stock",
  request: { params: ReceiptIdParamSchema },
  responses: {
    204: { description: "Inventory receipt deleted, stock reverted" },
    404: errorBody("Inventory receipt not found"),
  },
});

// ── Handlers ──────────────────────────────────────────────────────────────────

inventoryReceiptsRouter.openapi(listReceiptsRoute, async (c) => {
  const { isActive, page, pageSize } = c.req.valid("query");
  const config = getConfig(c.env);
  const db = createDb(config.DATABASE_URL);
  const service = createInventoryReceiptService(db);

  const filters = isActive !== undefined ? { isActive: isActive === "true" } : undefined;
  const result = await service.listReceipts(filters, page, pageSize);
  return c.json(result, 200);
});

inventoryReceiptsRouter.openapi(getReceiptRoute, async (c) => {
  const { id } = c.req.valid("param");
  const config = getConfig(c.env);
  const db = createDb(config.DATABASE_URL);
  const service = createInventoryReceiptService(db);
  const receipt = await service.getReceiptById(id);
  return c.json(receipt, 200);
});

inventoryReceiptsRouter.openapi(createReceiptRoute, async (c) => {
  const body = c.req.valid("json");
  const { sub: receivedById } = c.get("user");
  const config = getConfig(c.env);
  const db = createDb(config.DATABASE_URL);
  const service = createInventoryReceiptService(db);
  const receipt = await service.createReceipt(body, receivedById);
  return c.json(receipt, 201);
});

inventoryReceiptsRouter.openapi(updateReceiptRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const config = getConfig(c.env);
  const db = createDb(config.DATABASE_URL);
  const service = createInventoryReceiptService(db);
  const receipt = await service.updateReceiptHeader(id, body);
  return c.json(receipt, 200);
});

inventoryReceiptsRouter.openapi(updateReceiptDetailRoute, async (c) => {
  const { receiptId, detailId } = c.req.valid("param");
  const body = c.req.valid("json");
  const config = getConfig(c.env);
  const db = createDb(config.DATABASE_URL);
  const service = createInventoryReceiptService(db);
  const receipt = await service.updateReceiptDetail(receiptId, detailId, body);
  return c.json(receipt, 200);
});

inventoryReceiptsRouter.openapi(deleteReceiptRoute, async (c) => {
  const { id } = c.req.valid("param");
  const config = getConfig(c.env);
  const db = createDb(config.DATABASE_URL);
  const service = createInventoryReceiptService(db);
  await service.deleteReceipt(id);
  return c.body(null, 204);
});
