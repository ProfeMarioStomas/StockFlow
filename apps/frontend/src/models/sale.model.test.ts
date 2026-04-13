import { describe, expect, it } from "vitest";
import { createSaleSchema, updateSaleSchema } from "./sale.model";

describe("createSaleSchema", () => {
  const validItem = {
    productId: "00000000-0000-0000-0000-000000000001",
    quantity: 2,
    unitPrice: 9.99,
  };
  const valid = { paymentMethod: "cash", items: [validItem] };

  it("passes with valid data", () => {
    expect(createSaleSchema.safeParse(valid).success).toBe(true);
  });

  it("passes with card payment method", () => {
    expect(createSaleSchema.safeParse({ ...valid, paymentMethod: "card" }).success).toBe(true);
  });

  it("passes with transfer payment method", () => {
    expect(createSaleSchema.safeParse({ ...valid, paymentMethod: "transfer" }).success).toBe(true);
  });

  it("fails with invalid payment method", () => {
    expect(createSaleSchema.safeParse({ ...valid, paymentMethod: "crypto" }).success).toBe(false);
  });

  it("fails when paymentMethod is missing", () => {
    expect(createSaleSchema.safeParse({ items: [validItem] }).success).toBe(false);
  });

  it("fails with empty items array", () => {
    expect(createSaleSchema.safeParse({ paymentMethod: "cash", items: [] }).success).toBe(false);
  });

  it("passes with multiple items", () => {
    const result = createSaleSchema.safeParse({
      paymentMethod: "cash",
      items: [validItem, { productId: "other-id", quantity: 1, unitPrice: 4.5 }],
    });
    expect(result.success).toBe(true);
  });

  it("coerces quantity from string to number", () => {
    const result = createSaleSchema.safeParse({
      paymentMethod: "cash",
      items: [{ ...validItem, quantity: "3" }],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.items[0].quantity).toBe(3);
  });

  it("coerces unitPrice from string to number", () => {
    const result = createSaleSchema.safeParse({
      paymentMethod: "cash",
      items: [{ ...validItem, unitPrice: "14.99" }],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.items[0].unitPrice).toBe(14.99);
  });

  it("fails with zero quantity", () => {
    expect(
      createSaleSchema.safeParse({ ...valid, items: [{ ...validItem, quantity: 0 }] }).success,
    ).toBe(false);
  });

  it("fails with negative quantity", () => {
    expect(
      createSaleSchema.safeParse({ ...valid, items: [{ ...validItem, quantity: -1 }] }).success,
    ).toBe(false);
  });

  it("fails with fractional quantity", () => {
    expect(
      createSaleSchema.safeParse({ ...valid, items: [{ ...validItem, quantity: 1.5 }] }).success,
    ).toBe(false);
  });

  it("fails with zero unitPrice", () => {
    expect(
      createSaleSchema.safeParse({ ...valid, items: [{ ...validItem, unitPrice: 0 }] }).success,
    ).toBe(false);
  });

  it("fails with negative unitPrice", () => {
    expect(
      createSaleSchema.safeParse({ ...valid, items: [{ ...validItem, unitPrice: -5 }] }).success,
    ).toBe(false);
  });

  it("fails with empty productId", () => {
    expect(
      createSaleSchema.safeParse({ ...valid, items: [{ ...validItem, productId: "" }] }).success,
    ).toBe(false);
  });
});

describe("updateSaleSchema", () => {
  it("passes with empty object — all fields optional", () => {
    expect(updateSaleSchema.safeParse({}).success).toBe(true);
  });

  it("passes with paymentMethod only", () => {
    expect(updateSaleSchema.safeParse({ paymentMethod: "card" }).success).toBe(true);
  });

  it("passes with isActive false", () => {
    expect(updateSaleSchema.safeParse({ isActive: false }).success).toBe(true);
  });

  it("passes with all fields", () => {
    expect(updateSaleSchema.safeParse({ paymentMethod: "transfer", isActive: true }).success).toBe(
      true,
    );
  });

  it("fails with invalid paymentMethod when provided", () => {
    expect(updateSaleSchema.safeParse({ paymentMethod: "bitcoin" }).success).toBe(false);
  });
});
