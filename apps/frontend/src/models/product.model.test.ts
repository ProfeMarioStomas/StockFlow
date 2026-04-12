import { describe, expect, it } from "vitest";
import { createProductSchema, updateProductSchema } from "./product.model";

describe("createProductSchema", () => {
  const valid = { name: "Widget Pro", price: 19.99, stock: 100 };

  it("passes with valid data", () => {
    expect(createProductSchema.safeParse(valid).success).toBe(true);
  });

  it("passes without stock — it is optional", () => {
    expect(createProductSchema.safeParse({ name: "Widget", price: 5 }).success).toBe(true);
  });

  it("coerces price from string to number", () => {
    const result = createProductSchema.safeParse({ name: "Widget", price: "9.99" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.price).toBe(9.99);
  });

  it("coerces stock from string to number", () => {
    const result = createProductSchema.safeParse({ name: "Widget", price: 5, stock: "10" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.stock).toBe(10);
  });

  it("fails with empty name", () => {
    expect(createProductSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
  });

  it("fails with zero price", () => {
    expect(createProductSchema.safeParse({ ...valid, price: 0 }).success).toBe(false);
  });

  it("fails with negative price", () => {
    expect(createProductSchema.safeParse({ ...valid, price: -1 }).success).toBe(false);
  });

  it("fails with negative stock", () => {
    expect(createProductSchema.safeParse({ ...valid, stock: -1 }).success).toBe(false);
  });

  it("fails with fractional stock", () => {
    expect(createProductSchema.safeParse({ ...valid, stock: 1.5 }).success).toBe(false);
  });

  it("fails when required fields are missing", () => {
    expect(createProductSchema.safeParse({}).success).toBe(false);
  });
});

describe("updateProductSchema", () => {
  it("passes with all fields provided", () => {
    const result = updateProductSchema.safeParse({
      name: "Widget v2",
      price: 24.99,
      isActive: false,
    });
    expect(result.success).toBe(true);
  });

  it("passes with empty object — all fields optional", () => {
    expect(updateProductSchema.safeParse({}).success).toBe(true);
  });

  it("coerces price from string to number", () => {
    const result = updateProductSchema.safeParse({ price: "14.99" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.price).toBe(14.99);
  });

  it("fails with empty name when provided", () => {
    expect(updateProductSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("fails with zero price when provided", () => {
    expect(updateProductSchema.safeParse({ price: 0 }).success).toBe(false);
  });

  it("fails with negative price when provided", () => {
    expect(updateProductSchema.safeParse({ price: -5 }).success).toBe(false);
  });
});
