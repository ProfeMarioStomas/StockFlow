import { createMiddleware } from "hono/factory";
import type { AppContext } from "../types";

/**
 * Reads X-Correlation-Id from the incoming request.
 * Generates a new UUID v4 if absent.
 * Attaches the ID to context (c.var.correlationId) and echoes it in the response header.
 */
export const correlationMiddleware = createMiddleware<AppContext>(async (c, next) => {
  const correlationId = c.req.header("X-Correlation-Id") ?? crypto.randomUUID();
  c.set("correlationId", correlationId);
  c.header("X-Correlation-Id", correlationId);
  await next();
});
