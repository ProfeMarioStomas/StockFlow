import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("hashPassword", () => {
  it("returns a string in {salt}:{hash} format", async () => {
    const result = await hashPassword("mypassword");
    const parts = result.split(":");
    expect(parts).toHaveLength(2);
    expect(parts[0]!.length).toBeGreaterThan(0);
    expect(parts[1]!.length).toBeGreaterThan(0);
  });

  it("produces different hashes for the same password due to random salt", async () => {
    const h1 = await hashPassword("samepassword");
    const h2 = await hashPassword("samepassword");
    expect(h1).not.toBe(h2);
  });
});

describe("verifyPassword", () => {
  it("returns true when the password matches the stored hash", async () => {
    const stored = await hashPassword("correct-password");
    expect(await verifyPassword("correct-password", stored)).toBe(true);
  });

  it("returns false when the password does not match", async () => {
    const stored = await hashPassword("correct-password");
    expect(await verifyPassword("wrong-password", stored)).toBe(false);
  });

  it("returns false for a malformed stored string (no colon)", async () => {
    expect(await verifyPassword("password", "notavalidhash")).toBe(false);
  });

  it("returns false for an empty stored string", async () => {
    expect(await verifyPassword("password", "")).toBe(false);
  });
});
