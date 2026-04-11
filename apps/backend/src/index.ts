import { Hono } from "hono";
import { correlationMiddleware } from "./middleware/correlation";
import { errorHandler } from "./middleware/error";
import type { AppContext } from "./types";

const app = new Hono<AppContext>();

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
// Mount feature routers here as they are implemented:
// import { authRouter } from "./controllers/auth.controller";
// app.route("/api/v1/auth", authRouter);

export default app;
