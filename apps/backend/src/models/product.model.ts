import { z } from "@hono/zod-openapi";

// ── Schemas ───────────────────────────────────────────────────────────────────

export const CreateProductSchema = z
  .object({
    name: z
      .string()
      .min(1, { error: "Name is required" })
      .max(255)
      .openapi({ example: "Widget Pro" }),
    price: z
      .number({ error: "Price must be a number" })
      .positive({ error: "Price must be positive" })
      .openapi({ example: 19.99 }),
    stock: z
      .number({ error: "Stock must be a number" })
      .int({ error: "Stock must be an integer" })
      .nonnegative({ error: "Stock cannot be negative" })
      .optional()
      .openapi({ example: 100 }),
  })
  .openapi("CreateProductInput");

export const UpdateProductSchema = z
  .object({
    name: z
      .string()
      .min(1, { error: "Name is required" })
      .max(255)
      .optional()
      .openapi({ example: "Widget Pro v2" }),
    price: z
      .number({ error: "Price must be a number" })
      .positive({ error: "Price must be positive" })
      .optional()
      .openapi({ example: 24.99 }),
    isActive: z.boolean().optional().openapi({ example: true }),
  })
  .openapi("UpdateProductInput");

export const ProductResponseSchema = z
  .object({
    id: z.uuid().openapi({ example: "00000000-0000-0000-0000-000000000001" }),
    name: z.string().openapi({ example: "Widget Pro" }),
    price: z.number().openapi({ example: 19.99 }),
    stock: z.number().openapi({ example: 100 }),
    isActive: z.boolean().openapi({ example: true }),
    createdAt: z.string().openapi({ example: "2024-01-01T00:00:00.000Z" }),
    updatedAt: z.string().openapi({ example: "2024-01-01T00:00:00.000Z" }),
  })
  .openapi("ProductResponse");

// ── Inferred types ────────────────────────────────────────────────────────────

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type ProductResponse = z.infer<typeof ProductResponseSchema>;
