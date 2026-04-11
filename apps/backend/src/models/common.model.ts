import { z } from "@hono/zod-openapi";

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
