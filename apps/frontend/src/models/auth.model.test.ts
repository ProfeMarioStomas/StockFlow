import { describe, expect, it } from "vitest";
import { loginSchema } from "./auth.model";

describe("loginSchema", () => {
  it("passes with valid email and password", () => {
    const result = loginSchema.safeParse({ email: "user@example.com", password: "secret" });
    expect(result.success).toBe(true);
  });

  it("fails with invalid email", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "secret" });
    expect(result.success).toBe(false);
  });

  it("fails with empty email", () => {
    const result = loginSchema.safeParse({ email: "", password: "secret" });
    expect(result.success).toBe(false);
  });

  it("fails with empty password", () => {
    const result = loginSchema.safeParse({ email: "user@example.com", password: "" });
    expect(result.success).toBe(false);
  });

  it("fails when fields are missing", () => {
    const result = loginSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
