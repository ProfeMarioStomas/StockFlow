import { z } from "@hono/zod-openapi";

// ── Pagination ─────────────────────────────────────────────────────────────────

export const PaginationQuerySchema = z.object({
  page: z.coerce
    .number({ error: "Page must be a number" })
    .int({ error: "Page must be an integer" })
    .min(1, { error: "Page must be at least 1" })
    .default(1)
    .openapi({ example: 1, description: "Page number (1-indexed)" }),
  pageSize: z.coerce
    .number({ error: "Page size must be a number" })
    .int({ error: "Page size must be an integer" })
    .min(1, { error: "Page size must be at least 1" })
    .max(100, { error: "Page size cannot exceed 100" })
    .default(20)
    .openapi({ example: 20, description: "Items per page (max: 100)" }),
});

export const PaginationMetaSchema = z
  .object({
    page: z.number().openapi({ example: 1 }),
    pageSize: z.number().openapi({ example: 20 }),
    total: z.number().openapi({ example: 100 }),
    totalPages: z.number().openapi({ example: 5 }),
  })
  .openapi("PaginationMeta");

export function paginatedSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    meta: PaginationMetaSchema,
  });
}

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;
export type PaginatedResponse<T> = { data: T[]; meta: PaginationMeta };

// ── Standard error response shape ─────────────────────────────────────────────
// Used in every 4xx/5xx response across all endpoints.

const ValidationDetailSchema = z.object({
  field: z.string().openapi({ example: "email" }),
  message: z.string().openapi({ example: "Invalid email address" }),
});

export const ErrorResponseSchema = z
  .object({
    error: z.object({
      code: z.string().openapi({ example: "NOT_FOUND" }),
      message: z.string().openapi({ example: "User not found" }),
      details: z.array(ValidationDetailSchema),
    }),
  })
  .openapi("ErrorResponse");
