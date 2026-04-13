// This is the ONLY file allowed to read environment bindings (c.env).
// All other modules must receive config values as function parameters.

import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(32, { error: "JWT_SECRET must be at least 32 characters" }),
  NODE_ENV: z.enum(["development", "test", "production"]).default("production"),
  R2_PUBLIC_URL: z.url(),
});

export type AppConfig = z.infer<typeof EnvSchema>;

/**
 * Validates and returns typed configuration from Cloudflare Workers environment bindings.
 *
 * Usage (in middleware or entry point only):
 *   const config = getConfig(c.env);
 *
 * Throws on missing or invalid values — fail fast, never silently fall back.
 */
export function getConfig(env: Record<string, unknown>): AppConfig {
  const result = EnvSchema.safeParse(env);

  if (!result.success) {
    const formatted = JSON.stringify(result.error.format(), null, 2);
    throw new Error(`Invalid environment configuration:\n${formatted}`);
  }

  return result.data;
}
