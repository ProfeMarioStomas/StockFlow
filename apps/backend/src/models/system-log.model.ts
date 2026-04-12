import { z } from "@hono/zod-openapi";

// ── Response schema ────────────────────────────────────────────────────────────

export const SystemLogResponseSchema = z
  .object({
    id: z.uuid().openapi({ example: "00000000-0000-0000-0000-000000000001" }),
    userId: z.uuid().openapi({ example: "00000000-0000-0000-0000-000000000099" }),
    note: z.string().openapi({ example: "POST /api/v1/sales → 201" }),
    createdAt: z.string().openapi({ example: "2024-01-01T00:00:00.000Z" }),
    updatedAt: z.string().openapi({ example: "2024-01-01T00:00:00.000Z" }),
  })
  .openapi("SystemLogResponse");

// ── Inferred types ─────────────────────────────────────────────────────────────

export type SystemLogResponse = z.infer<typeof SystemLogResponseSchema>;
