import { SignJWT, jwtVerify, type JWTPayload } from "jose";

/**
 * Signs a JWT with HS256 using the provided secret.
 * @param payload - Claims to include (must not contain 'exp' — set via expiresInSeconds)
 * @param secret - Signing secret (raw string, will be encoded)
 * @param expiresInSeconds - TTL in seconds from now
 */
export async function signJwt(
  payload: Record<string, unknown>,
  secret: string,
  expiresInSeconds: number,
): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresInSeconds)
    .sign(key);
}

/**
 * Verifies a JWT and returns the payload.
 * Throws if the token is invalid, expired, or tampered.
 */
export async function verifyJwt(token: string, secret: string): Promise<JWTPayload> {
  const key = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, key);
  return payload;
}

/**
 * Generates a cryptographically random opaque token (UUID v4).
 * Use as a refresh token — store only the hash, never the raw value.
 */
export function generateOpaqueToken(): string {
  return crypto.randomUUID();
}

/**
 * Hashes a token with SHA-256 (hex output).
 * Uses Web Crypto API — no external dependencies, compatible with Cloudflare Workers.
 */
export async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
