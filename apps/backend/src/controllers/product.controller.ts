import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import { getConfig } from "../config";
import { createDb } from "../db/client";
import { throwValidationError } from "../lib/validation";
import {
  ErrorResponseSchema,
  PaginationQuerySchema,
  paginatedSchema,
} from "../models/common.model";
import {
  CreateProductSchema,
  ProductResponseSchema,
  UpdateProductSchema,
  UploadImageResponseSchema,
} from "../models/product.model";
import { createProductService } from "../services/product.service";
import type { AppContext } from "../types";

// ── Shared schemas ────────────────────────────────────────────────────────────

const IdParamSchema = z.object({
  id: z.uuid().openapi({ example: "00000000-0000-0000-0000-000000000001" }),
});

const ListProductsQuerySchema = PaginationQuerySchema.extend({
  isActive: z
    .enum(["true", "false"])
    .optional()
    .openapi({ example: "true", description: "Filter products by active status" }),
});

const IsActiveQuerySchema = z.object({
  isActive: z
    .enum(["true", "false"])
    .optional()
    .openapi({ example: "true", description: "Filter products by active status" }),
});

const PaginatedProductsSchema = paginatedSchema(ProductResponseSchema).openapi("PaginatedProducts");

// ── Error response shorthand ──────────────────────────────────────────────────

const errorBody = (description: string) => ({
  content: { "application/json": { schema: ErrorResponseSchema } },
  description,
});

// ── Router ────────────────────────────────────────────────────────────────────

export const productsRouter = new OpenAPIHono<AppContext>({
  defaultHook: (result, _c) => {
    if (!result.success) throwValidationError(result.error);
  },
});

// ── Route definitions ─────────────────────────────────────────────────────────

// NOTE: /images must be declared before /:id to avoid route conflict.
const uploadImageRoute = createRoute({
  method: "post",
  path: "/images",
  tags: ["Products"],
  summary: "Upload a product image to R2",
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({
            file: z.any().openapi({ type: "string", format: "binary" }),
          }),
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: UploadImageResponseSchema } },
      description: "Image uploaded — returns key and public URL",
    },
    400: errorBody("Unsupported file type"),
    413: errorBody("File too large"),
  },
});

const listProductsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Products"],
  summary: "List products (paginated)",
  request: { query: ListProductsQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: PaginatedProductsSchema } },
      description: "Returns a paginated list of products",
    },
  },
});

const listAllProductsRoute = createRoute({
  method: "get",
  path: "/all",
  tags: ["Products"],
  summary: "List all products without pagination (for selects/dropdowns)",
  request: { query: IsActiveQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(ProductResponseSchema) } },
      description: "Returns all products as a flat array",
    },
  },
});

const getProductRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Products"],
  summary: "Get a product by ID",
  request: { params: IdParamSchema },
  responses: {
    200: {
      content: { "application/json": { schema: ProductResponseSchema } },
      description: "Product found",
    },
    404: errorBody("Product not found"),
  },
});

const createProductRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Products"],
  summary: "Create a new product",
  request: {
    body: {
      content: { "application/json": { schema: CreateProductSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: ProductResponseSchema } },
      description: "Product created",
    },
    400: errorBody("Validation error"),
  },
});

const updateProductRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Products"],
  summary: "Update a product",
  request: {
    params: IdParamSchema,
    body: {
      content: { "application/json": { schema: UpdateProductSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: ProductResponseSchema } },
      description: "Product updated",
    },
    400: errorBody("Validation error"),
    404: errorBody("Product not found"),
  },
});

const deleteProductRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Products"],
  summary: "Soft-delete a product",
  request: { params: IdParamSchema },
  responses: {
    204: { description: "Product deleted" },
    404: errorBody("Product not found"),
  },
});

// ── Handlers ──────────────────────────────────────────────────────────────────

productsRouter.openapi(uploadImageRoute, async (c) => {
  const body = await c.req.parseBody();
  const file = body.file;

  if (!(file instanceof File)) {
    throw new HTTPException(400, { message: "file field is required" });
  }

  const config = getConfig(c.env);
  const db = createDb(config.DATABASE_URL);
  const service = createProductService(db);
  // c.env.BUCKET is an R2 service binding — not accessible via getConfig()
  const result = await service.uploadProductImage(c.env.BUCKET, file, config.R2_PUBLIC_URL);
  return c.json(result, 201);
});

productsRouter.openapi(listProductsRoute, async (c) => {
  const { isActive, page, pageSize } = c.req.valid("query");
  const config = getConfig(c.env);
  const db = createDb(config.DATABASE_URL);
  const service = createProductService(db);

  const filters = isActive !== undefined ? { isActive: isActive === "true" } : undefined;
  const result = await service.listProducts(filters, page, pageSize);
  return c.json(result, 200);
});

productsRouter.openapi(listAllProductsRoute, async (c) => {
  const { isActive } = c.req.valid("query");
  const config = getConfig(c.env);
  const db = createDb(config.DATABASE_URL);
  const service = createProductService(db);

  const filters = isActive !== undefined ? { isActive: isActive === "true" } : undefined;
  const products = await service.listAllProducts(filters);
  return c.json(products, 200);
});

productsRouter.openapi(getProductRoute, async (c) => {
  const { id } = c.req.valid("param");
  const config = getConfig(c.env);
  const db = createDb(config.DATABASE_URL);
  const service = createProductService(db);
  const product = await service.getProductById(id);
  return c.json(product, 200);
});

productsRouter.openapi(createProductRoute, async (c) => {
  const body = c.req.valid("json");
  const config = getConfig(c.env);
  const db = createDb(config.DATABASE_URL);
  const service = createProductService(db);
  const product = await service.createProduct(body);
  return c.json(product, 201);
});

productsRouter.openapi(updateProductRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const config = getConfig(c.env);
  const db = createDb(config.DATABASE_URL);
  const service = createProductService(db);
  const product = await service.updateProduct(id, body);
  return c.json(product, 200);
});

productsRouter.openapi(deleteProductRoute, async (c) => {
  const { id } = c.req.valid("param");
  const config = getConfig(c.env);
  const db = createDb(config.DATABASE_URL);
  const service = createProductService(db);
  await service.deleteProduct(id);
  return c.body(null, 204);
});
