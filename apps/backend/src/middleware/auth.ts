import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { jwtVerify, type JWTPayload } from "jose";
import type { AppContext } from "../types";
import { getConfig } from "../config";

export type AuthUser = JWTPayload & {
  sub: string;
};

/**
 * Verifies the JWT access token from the httpOnly cookie.
 * Attaches the verified payload to c.var.user on success.
 * Returns 401 if the token is missing, expired, or invalid.
 *
 * Apply at the router level for protected routes — never per-route:
 *   app.use("/api/v1/*", authMiddleware);
 */
export const authMiddleware = createMiddleware<AppContext>(async (c, next) => {
  const config = getConfig(c.env);
  const token = getCookie(c, "access_token");

  if (!token) {
    return c.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
          details: [],
        },
      },
      401,
    );
  }

  try {
    const secret = new TextEncoder().encode(config.JWT_SECRET);
    await jwtVerify(token, secret);
    // TODO: attach user payload to context once Variables type includes it
    // const { payload } = await jwtVerify(token, secret);
    // c.set("user", payload as AuthUser);
  } catch {
    return c.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid or expired token",
          details: [],
        },
      },
      401,
    );
  }

  await next();
});
