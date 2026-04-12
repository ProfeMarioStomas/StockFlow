import { describe, expect, it } from "vitest";
import { createUserSchema, updateUserSchema } from "./user.model";

describe("createUserSchema", () => {
  const valid = {
    name: "John Doe",
    email: "john@example.com",
    password: "secret123",
    role: "seller" as const,
  };

  it("passes with valid data", () => {
    expect(createUserSchema.safeParse(valid).success).toBe(true);
  });

  it("fails with empty name", () => {
    expect(createUserSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
  });

  it("fails with invalid email", () => {
    expect(createUserSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
  });

  it("fails with password shorter than 8 characters", () => {
    expect(createUserSchema.safeParse({ ...valid, password: "short" }).success).toBe(false);
  });

  it("fails with invalid role", () => {
    expect(createUserSchema.safeParse({ ...valid, role: "manager" as never }).success).toBe(false);
  });

  it("fails when fields are missing", () => {
    expect(createUserSchema.safeParse({}).success).toBe(false);
  });
});

describe("updateUserSchema", () => {
  it("passes with all fields provided", () => {
    const result = updateUserSchema.safeParse({
      name: "Jane Doe",
      email: "jane@example.com",
      role: "admin",
      isActive: false,
    });
    expect(result.success).toBe(true);
  });

  it("passes with empty object — all fields optional", () => {
    expect(updateUserSchema.safeParse({}).success).toBe(true);
  });

  it("fails with invalid email when provided", () => {
    expect(updateUserSchema.safeParse({ email: "bad-email" }).success).toBe(false);
  });

  it("fails with empty name when provided", () => {
    expect(updateUserSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("fails with invalid role when provided", () => {
    expect(updateUserSchema.safeParse({ role: "manager" as never }).success).toBe(false);
  });
});
