import { describe, expect, it } from "vitest";
import { generateOpaqueToken, hashToken, signJwt, verifyJwt } from "../../lib/token";

const TEST_SECRET = "test-secret-key-that-is-at-least-32-chars-long";

describe("signJwt / verifyJwt", () => {
  it("produces a valid JWT that can be verified", async () => {
    const payload = { sub: "user-123", email: "test@example.com", role: "admin" };
    const token = await signJwt(payload, TEST_SECRET, 60);

    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // header.payload.signature

    const verified = await verifyJwt(token, TEST_SECRET);
    expect(verified.sub).toBe("user-123");
    expect(verified.email).toBe("test@example.com");
    expect(verified.role).toBe("admin");
  });

  it("sets expiration based on expiresInSeconds", async () => {
    const token = await signJwt({ sub: "user-1" }, TEST_SECRET, 300);
    const payload = await verifyJwt(token, TEST_SECRET);

    const now = Math.floor(Date.now() / 1000);
    expect(payload.exp).toBeGreaterThan(now + 290);
    expect(payload.exp).toBeLessThanOrEqual(now + 300);
  });

  it("throws when verifying with a wrong secret", async () => {
    const token = await signJwt({ sub: "user-1" }, TEST_SECRET, 60);
    await expect(verifyJwt(token, "wrong-secret-that-is-also-32-chars-long!!")).rejects.toThrow();
  });

  it("throws when verifying a tampered token", async () => {
    const token = await signJwt({ sub: "user-1" }, TEST_SECRET, 60);
    const tampered = token.slice(0, -5) + "XXXXX";
    await expect(verifyJwt(tampered, TEST_SECRET)).rejects.toThrow();
  });
});

describe("generateOpaqueToken", () => {
  it("returns a UUID v4 string", () => {
    const token = generateOpaqueToken();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(token)).toBe(true);
  });

  it("generates unique tokens on each call", () => {
    const t1 = generateOpaqueToken();
    const t2 = generateOpaqueToken();
    expect(t1).not.toBe(t2);
  });
});

describe("hashToken", () => {
  it("returns a 64-character hex string (SHA-256)", async () => {
    const hash = await hashToken("some-token");
    expect(typeof hash).toBe("string");
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
  });

  it("is deterministic — same input produces same hash", async () => {
    const h1 = await hashToken("my-refresh-token");
    const h2 = await hashToken("my-refresh-token");
    expect(h1).toBe(h2);
  });

  it("produces different hashes for different inputs", async () => {
    const h1 = await hashToken("token-a");
    const h2 = await hashToken("token-b");
    expect(h1).not.toBe(h2);
  });
});
