import { z } from "@hono/zod-openapi";

// ── Item schema for creating a sale ───────────────────────────────────────────

export const CreateSaleItemSchema = z
  .object({
    productId: z.uuid().openapi({ example: "00000000-0000-0000-0000-000000000003" }),
    quantity: z
      .number({ error: "Quantity must be a number" })
      .int({ error: "Quantity must be an integer" })
      .positive({ error: "Quantity must be positive" })
      .openapi({ example: 2 }),
    unitPrice: z
      .number({ error: "Unit price must be a number" })
      .positive({ error: "Unit price must be positive" })
      .openapi({ example: 9.99 }),
  })
  .openapi("CreateSaleItem");

// ── Create sale schema ─────────────────────────────────────────────────────────

export const CreateSaleSchema = z
  .object({
    paymentMethod: z
      .enum(["cash", "card", "transfer"], { error: "Invalid payment method" })
      .openapi({ example: "cash" }),
    items: z
      .array(CreateSaleItemSchema)
      .min(1, { error: "At least one item is required" })
      .openapi({ example: [] }),
  })
  .openapi("CreateSaleInput");

// ── Update sale header schema ──────────────────────────────────────────────────

export const UpdateSaleHeaderSchema = z
  .object({
    paymentMethod: z.enum(["cash", "card", "transfer"]).optional().openapi({ example: "card" }),
    isActive: z.boolean().optional().openapi({ example: true }),
  })
  .openapi("UpdateSaleHeaderInput");

// ── Update sale detail schema ──────────────────────────────────────────────────

export const UpdateSaleDetailSchema = z
  .object({
    quantity: z
      .number({ error: "Quantity must be a number" })
      .int({ error: "Quantity must be an integer" })
      .positive({ error: "Quantity must be positive" })
      .optional()
      .openapi({ example: 5 }),
    unitPrice: z
      .number({ error: "Unit price must be a number" })
      .positive({ error: "Unit price must be positive" })
      .optional()
      .openapi({ example: 12.99 }),
  })
  .openapi("UpdateSaleDetailInput");

// ── Response schemas ───────────────────────────────────────────────────────────

export const SaleDetailResponseSchema = z
  .object({
    id: z.uuid().openapi({ example: "00000000-0000-0000-0000-000000000002" }),
    saleId: z.uuid().openapi({ example: "00000000-0000-0000-0000-000000000001" }),
    productId: z.uuid().openapi({ example: "00000000-0000-0000-0000-000000000003" }),
    quantity: z.number().openapi({ example: 2 }),
    unitPrice: z.number().openapi({ example: 9.99 }),
    createdAt: z.string().openapi({ example: "2024-01-01T00:00:00.000Z" }),
    updatedAt: z.string().openapi({ example: "2024-01-01T00:00:00.000Z" }),
  })
  .openapi("SaleDetailResponse");

export const SaleResponseSchema = z
  .object({
    id: z.uuid().openapi({ example: "00000000-0000-0000-0000-000000000001" }),
    totalAmount: z.number().openapi({ example: 19.98 }),
    paymentMethod: z.enum(["cash", "card", "transfer"]).openapi({ example: "cash" }),
    sellerId: z.uuid().openapi({ example: "00000000-0000-0000-0000-000000000099" }),
    isActive: z.boolean().openapi({ example: true }),
    createdAt: z.string().openapi({ example: "2024-01-01T00:00:00.000Z" }),
    updatedAt: z.string().openapi({ example: "2024-01-01T00:00:00.000Z" }),
    details: z.array(SaleDetailResponseSchema).openapi({ example: [] }),
  })
  .openapi("SaleResponse");

// ── Inferred types ────────────────────────────────────────────────────────────

export type CreateSaleInput = z.infer<typeof CreateSaleSchema>;
export type UpdateSaleHeaderInput = z.infer<typeof UpdateSaleHeaderSchema>;
export type UpdateSaleDetailInput = z.infer<typeof UpdateSaleDetailSchema>;
export type SaleDetailResponse = z.infer<typeof SaleDetailResponseSchema>;
export type SaleResponse = z.infer<typeof SaleResponseSchema>;
