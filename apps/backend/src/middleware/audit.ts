import { createMiddleware } from "hono/factory";
import { getConfig } from "../config";
import { createDb } from "../db/client";
import { createSystemLogService } from "../services/system-log.service";
import type { AppContext } from "../types";

const AUDITED_METHODS = new Set(["POST", "PUT", "DELETE"]);

/**
 * Writes an audit log entry to system_logs after every successful POST, PUT, or DELETE.
 * Runs after the handler (post-next). Failures are silently swallowed so they never
 * affect the response already sent to the client.
 *
 * Note format: "METHOD /path → STATUS"
 *
 * Apply after authMiddleware so c.var.user is always available.
 */
export const auditMiddleware = createMiddleware<AppContext>(async (c, next) => {
  await next();

  if (!AUDITED_METHODS.has(c.req.method)) return;

  const user = c.get("user");
  if (!user) return;

  const status = c.res.status;
  const note = `${c.req.method} ${c.req.path} → ${status}`;

  try {
    const config = getConfig(c.env);
    const db = createDb(config.DATABASE_URL);
    const service = createSystemLogService(db);
    await service.createLog(user.sub, note);
  } catch {
    // Audit log failures must never affect the response
  }
});
