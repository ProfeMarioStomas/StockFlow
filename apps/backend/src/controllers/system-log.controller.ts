import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { getConfig } from "../config";
import { createDb } from "../db/client";
import { PaginationQuerySchema, paginatedSchema } from "../models/common.model";
import { SystemLogResponseSchema } from "../models/system-log.model";
import { createSystemLogService } from "../services/system-log.service";
import type { AppContext } from "../types";

// ── Shared schemas ────────────────────────────────────────────────────────────

const SystemLogQuerySchema = PaginationQuerySchema.extend({
  userId: z.uuid().optional().openapi({
    example: "00000000-0000-0000-0000-000000000099",
    description: "Filter logs by user ID",
  }),
});

const PaginatedSystemLogsSchema =
  paginatedSchema(SystemLogResponseSchema).openapi("PaginatedSystemLogs");

// ── Router ────────────────────────────────────────────────────────────────────

export const systemLogsRouter = new OpenAPIHono<AppContext>();

// ── Route definitions ─────────────────────────────────────────────────────────

const listSystemLogsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["System Logs"],
  summary: "List system audit logs (paginated)",
  request: { query: SystemLogQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: PaginatedSystemLogsSchema } },
      description: "Returns a paginated list of audit logs ordered by most recent first",
    },
  },
});

// ── Handlers ──────────────────────────────────────────────────────────────────

systemLogsRouter.openapi(listSystemLogsRoute, async (c) => {
  const { userId, page, pageSize } = c.req.valid("query");
  const config = getConfig(c.env);
  const db = createDb(config.DATABASE_URL);
  const service = createSystemLogService(db);

  const filters = userId !== undefined ? { userId } : undefined;
  const result = await service.listLogs(filters, page, pageSize);
  return c.json(result, 200);
});
