import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { correlationMiddleware } from "./middleware/correlation";
import { errorHandler } from "./middleware/error";
import type { AppContext } from "./types";
import { usersRouter } from "./controllers/user.controller";

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
app.route("/api/v1/users", usersRouter);

// Mount feature routers here as they are implemented:
// import { authRouter } from "./controllers/auth.controller";
// app.route("/api/v1/auth", authRouter);

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
