import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { authRouter } from "./controllers/auth.controller";
import { inventoryReceiptsRouter } from "./controllers/inventory-receipt.controller";
import { productsRouter } from "./controllers/product.controller";
import { salesRouter } from "./controllers/sale.controller";
import { systemLogsRouter } from "./controllers/system-log.controller";
import { usersRouter } from "./controllers/user.controller";
import { auditMiddleware } from "./middleware/audit";
import { authMiddleware } from "./middleware/auth";
import { correlationMiddleware } from "./middleware/correlation";
import { errorHandler } from "./middleware/error";
import type { AppContext } from "./types";

const app = new OpenAPIHono<AppContext>();

// ── Global middleware ────────────────────────────────────────────────────────
app.use("*", correlationMiddleware);

// ── Error handler ────────────────────────────────────────────────────────────
app.onError(errorHandler);

// ── Health probes ────────────────────────────────────────────────────────────

// Liveness — always 200 if the isolate is running
app.get("/health", (c) =>
  c.json({
    status: "ok",
    service: "stockflow-api",
    timestamp: new Date().toISOString(),
  }),
);

// Readiness — add dependency checks when services are wired up
app.get("/ready", (c) =>
  c.json({
    status: "ready",
    checks: {},
  }),
);

// ── API routes ───────────────────────────────────────────────────────────────

// Auth routes are mounted BEFORE the wildcard middleware so they stay public.
// Hono evaluates handlers in registration order — a matched route stops the chain.
app.route("/api/v1/auth", authRouter);

// Protect all other v1 routes with JWT auth
app.use("/api/v1/*", authMiddleware);

// Audit all mutations on protected routes (runs after authMiddleware sets user)
app.use("/api/v1/*", auditMiddleware);

app.route("/api/v1/users", usersRouter);
app.route("/api/v1/products", productsRouter);
app.route("/api/v1/sales", salesRouter);
app.route("/api/v1/inventory-receipts", inventoryReceiptsRouter);
app.route("/api/v1/system-logs", systemLogsRouter);

// ── OpenAPI spec & Swagger UI ─────────────────────────────────────────────────
app.doc("/api/docs/spec", {
  openapi: "3.1.0",
  info: {
    title: "StockFlow API",
    version: "1.0.0",
    description: "REST API for StockFlow — inventory and sales management",
  },
});

app.get("/api/docs", swaggerUI({ url: "/api/docs/spec" }));

export default app;
