// Shared Hono context types.
// Import these wherever Hono's generics are needed.

import type { JWTPayload } from "jose";

// Verified JWT payload attached to context by authMiddleware.
// Fields match the claims signed in auth.service.ts → signJwt().
export type AuthUser = JWTPayload & {
  sub: string;
  name: string;
  email: string;
  role: "admin" | "seller";
};

export type Bindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  NODE_ENV: "development" | "test" | "production";
  R2_PUBLIC_URL: string;
  // R2 service binding — not a string, so handled directly in controllers
  BUCKET: R2Bucket;
};

export type Variables = {
  correlationId: string;
  user: AuthUser;
};

export type AppContext = {
  Bindings: Bindings;
  Variables: Variables;
};
