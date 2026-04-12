import { z } from "@hono/zod-openapi";

// ── Schemas ───────────────────────────────────────────────────────────────────

export const LoginSchema = z
  .object({
    email: z.email({ error: "Invalid email address" }).openapi({ example: "john@example.com" }),
    password: z
      .string()
      .min(1, { error: "Password is required" })
      .openapi({ example: "••••••••", format: "password" }),
  })
  .openapi("LoginInput");

export const AuthUserSchema = z
  .object({
    id: z.uuid().openapi({ example: "00000000-0000-0000-0000-000000000001" }),
    name: z.string().openapi({ example: "John Doe" }),
    email: z.email().openapi({ example: "john@example.com" }),
    role: z.enum(["admin", "seller"]).openapi({ example: "seller" }),
  })
  .openapi("AuthUser");

export const LoginResponseSchema = z
  .object({
    user: AuthUserSchema,
  })
  .openapi("LoginResponse");

export const RefreshResponseSchema = z
  .object({
    user: AuthUserSchema,
  })
  .openapi("RefreshResponse");

// ── Inferred types ────────────────────────────────────────────────────────────

export type LoginInput = z.infer<typeof LoginSchema>;
export type AuthUserResponse = z.infer<typeof AuthUserSchema>;
