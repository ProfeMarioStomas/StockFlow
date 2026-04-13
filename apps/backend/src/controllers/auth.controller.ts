import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { getConfig } from "../config";
import { createDb } from "../db/client";
import { throwValidationError } from "../lib/validation";
import { authMiddleware } from "../middleware/auth";
import {
  AuthUserSchema,
  LoginResponseSchema,
  LoginSchema,
  RefreshResponseSchema,
} from "../models/auth.model";
import { ErrorResponseSchema } from "../models/common.model";
import { createAuthService } from "../services/auth.service";
import type { AppContext } from "../types";

// ── Error response shorthand ──────────────────────────────────────────────────

const errorBody = (description: string) => ({
  content: { "application/json": { schema: ErrorResponseSchema } },
  description,
});

// ── Router ────────────────────────────────────────────────────────────────────

export const authRouter = new OpenAPIHono<AppContext>({
  defaultHook: (result, _c) => {
    if (!result.success) throwValidationError(result.error);
  },
});

// Apply authMiddleware only to the /me route — all other auth routes are public
authRouter.use("/me", authMiddleware);

// ── Route definitions ─────────────────────────────────────────────────────────

const loginRoute = createRoute({
  method: "post",
  path: "/login",
  tags: ["Auth"],
  summary: "Login with email and password",
  request: {
    body: {
      content: { "application/json": { schema: LoginSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: LoginResponseSchema } },
      description: "Authenticated — access and refresh token cookies set",
    },
    400: errorBody("Validation error"),
    401: errorBody("Invalid credentials or account disabled"),
  },
});

const refreshRoute = createRoute({
  method: "post",
  path: "/refresh",
  tags: ["Auth"],
  summary: "Refresh access token using refresh token cookie",
  responses: {
    200: {
      content: { "application/json": { schema: RefreshResponseSchema } },
      description: "New access token cookie set",
    },
    401: errorBody("Invalid or expired refresh token"),
  },
});

const logoutRoute = createRoute({
  method: "post",
  path: "/logout",
  tags: ["Auth"],
  summary: "Logout and clear auth cookies",
  responses: {
    204: { description: "Logged out — cookies cleared" },
    401: errorBody("Unauthorized"),
  },
});

const meRoute = createRoute({
  method: "get",
  path: "/me",
  tags: ["Auth"],
  summary: "Return current authenticated user from JWT",
  responses: {
    200: {
      content: { "application/json": { schema: AuthUserSchema } },
      description: "Current user from JWT context",
    },
    401: errorBody("Not authenticated"),
  },
});

// ── Cookie helpers ────────────────────────────────────────────────────────────

function setAuthCookies(
  c: Context,
  accessToken: string,
  refreshToken: string,
  secure: boolean,
): void {
  // SameSite=None is required for cross-origin cookie sending (e.g. local frontend
  // against the production backend). It must be paired with Secure=true.
  // In local dev (secure=false) use Lax, which is safe for same-origin proxy usage.
  const sameSite = secure ? ("None" as const) : ("Lax" as const);
  const base = { httpOnly: true, secure, sameSite, path: "/" };
  setCookie(c, "access_token", accessToken, { ...base, maxAge: 900 });
  setCookie(c, "refresh_token", refreshToken, { ...base, maxAge: 604800 });
}

function clearAuthCookies(c: Context, secure: boolean): void {
  const sameSite = secure ? ("None" as const) : ("Lax" as const);
  const base = { httpOnly: true, secure, sameSite, path: "/" };
  deleteCookie(c, "access_token", base);
  deleteCookie(c, "refresh_token", base);
}

// ── Handlers ──────────────────────────────────────────────────────────────────

authRouter.openapi(loginRoute, async (c) => {
  const body = c.req.valid("json");
  const config = getConfig(c.env);
  const db = createDb(config.DATABASE_URL);
  const service = createAuthService(db);

  const result = await service.login(body.email, body.password, config.JWT_SECRET);
  setAuthCookies(c, result.accessToken, result.refreshToken, config.NODE_ENV === "production");
  return c.json({ user: result.user }, 200);
});

authRouter.openapi(refreshRoute, async (c) => {
  const config = getConfig(c.env);
  const rawRefreshToken = getCookie(c, "refresh_token");

  if (!rawRefreshToken) {
    return c.json(
      { error: { code: "INVALID_TOKEN", message: "Refresh token missing", details: [] } },
      401,
    );
  }

  const db = createDb(config.DATABASE_URL);
  const service = createAuthService(db);
  const result = await service.refresh(rawRefreshToken, config.JWT_SECRET);

  const isProduction = config.NODE_ENV === "production";
  setCookie(c, "access_token", result.accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "None" : "Lax",
    path: "/",
    maxAge: 900,
  });

  return c.json({ user: result.user }, 200);
});

authRouter.openapi(logoutRoute, async (c) => {
  const config = getConfig(c.env);
  const rawRefreshToken = getCookie(c, "refresh_token");

  if (rawRefreshToken) {
    const db = createDb(config.DATABASE_URL);
    const service = createAuthService(db);
    await service.logout(rawRefreshToken);
  }

  clearAuthCookies(c, config.NODE_ENV === "production");
  return c.body(null, 204);
});

authRouter.openapi(meRoute, async (c) => {
  const { sub: id, name, email, role } = c.get("user");
  return c.json({ id, name, email, role }, 200);
});
