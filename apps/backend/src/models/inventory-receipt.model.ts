import { z } from "@hono/zod-openapi";

// ── Item schema for creating a receipt ────────────────────────────────────────

export const CreateReceiptItemSchema = z
  .object({
    productId: z.uuid().openapi({ example: "00000000-0000-0000-0000-000000000003" }),
    quantity: z
      .number({ error: "Quantity must be a number" })
      .int({ error: "Quantity must be an integer" })
      .positive({ error: "Quantity must be positive" })
      .openapi({ example: 10 }),
  })
  .openapi("CreateReceiptItem");

// ── Create inventory receipt schema ───────────────────────────────────────────

export const CreateInventoryReceiptSchema = z
  .object({
    notes: z.string().optional().openapi({ example: "Lote A — proveedor XYZ" }),
    items: z
      .array(CreateReceiptItemSchema)
      .min(1, { error: "At least one item is required" })
      .openapi({ example: [] }),
  })
  .openapi("CreateInventoryReceiptInput");

// ── Update receipt header schema ───────────────────────────────────────────────

export const UpdateInventoryReceiptSchema = z
  .object({
    notes: z.string().optional().openapi({ example: "Lote B — corrección" }),
    isActive: z.boolean().optional().openapi({ example: true }),
  })
  .openapi("UpdateInventoryReceiptInput");

// ── Update receipt detail schema ───────────────────────────────────────────────

export const UpdateReceiptDetailSchema = z
  .object({
    quantity: z
      .number({ error: "Quantity must be a number" })
      .int({ error: "Quantity must be an integer" })
      .positive({ error: "Quantity must be positive" })
      .optional()
      .openapi({ example: 15 }),
  })
  .openapi("UpdateReceiptDetailInput");

// ── Response schemas ───────────────────────────────────────────────────────────

export const ReceiptDetailResponseSchema = z
  .object({
    id: z.uuid().openapi({ example: "00000000-0000-0000-0000-000000000002" }),
    receiptId: z.uuid().openapi({ example: "00000000-0000-0000-0000-000000000001" }),
    productId: z.uuid().openapi({ example: "00000000-0000-0000-0000-000000000003" }),
    quantity: z.number().openapi({ example: 10 }),
    createdAt: z.string().openapi({ example: "2024-01-01T00:00:00.000Z" }),
    updatedAt: z.string().openapi({ example: "2024-01-01T00:00:00.000Z" }),
  })
  .openapi("ReceiptDetailResponse");

export const InventoryReceiptResponseSchema = z
  .object({
    id: z.uuid().openapi({ example: "00000000-0000-0000-0000-000000000001" }),
    notes: z.string().nullable().openapi({ example: "Lote A" }),
    receivedById: z.uuid().openapi({ example: "00000000-0000-0000-0000-000000000099" }),
    isActive: z.boolean().openapi({ example: true }),
    createdAt: z.string().openapi({ example: "2024-01-01T00:00:00.000Z" }),
    updatedAt: z.string().openapi({ example: "2024-01-01T00:00:00.000Z" }),
    details: z.array(ReceiptDetailResponseSchema).openapi({ example: [] }),
  })
  .openapi("InventoryReceiptResponse");

// ── Inferred types ─────────────────────────────────────────────────────────────

export type CreateInventoryReceiptInput = z.infer<typeof CreateInventoryReceiptSchema>;
export type UpdateInventoryReceiptInput = z.infer<typeof UpdateInventoryReceiptSchema>;
export type UpdateReceiptDetailInput = z.infer<typeof UpdateReceiptDetailSchema>;
export type ReceiptDetailResponse = z.infer<typeof ReceiptDetailResponseSchema>;
export type InventoryReceiptResponse = z.infer<typeof InventoryReceiptResponseSchema>;
