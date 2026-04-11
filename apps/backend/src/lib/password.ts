/**
 * Password hashing utilities using Web Crypto API (PBKDF2).
 * No external dependencies — native to Cloudflare Workers runtime.
 *
 * Stored format: "{saltBase64}:{hashBase64}"
 * Parameters: PBKDF2, SHA-256, 100,000 iterations, 256-bit output
 */

const ITERATIONS = 100_000;
const KEY_LENGTH = 32; // 256 bits
const ALGORITHM = "SHA-256";

function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToBuffer(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function deriveKey(password: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  return crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: ITERATIONS,
      hash: ALGORITHM,
    },
    keyMaterial,
    KEY_LENGTH * 8,
  );
}

/**
 * Hashes a plaintext password.
 * @returns A string in the format "{saltBase64}:{hashBase64}"
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await deriveKey(password, salt);
  return `${bufferToBase64(salt)}:${bufferToBase64(hash)}`;
}

/**
 * Verifies a plaintext password against a stored hash.
 * Uses constant-time comparison to prevent timing attacks.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltB64, hashB64] = stored.split(":");
  if (!saltB64 || !hashB64) return false;

  const salt = base64ToBuffer(saltB64);
  const expectedHash = base64ToBuffer(hashB64);
  const actualHash = new Uint8Array(await deriveKey(password, salt));

  // Constant-time comparison
  if (actualHash.length !== expectedHash.length) return false;

  let diff = 0;
  for (let i = 0; i < actualHash.length; i++) {
    diff |= actualHash[i] ^ expectedHash[i];
  }

  return diff === 0;
}
