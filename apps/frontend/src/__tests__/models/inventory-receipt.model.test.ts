import { describe, expect, it } from "vitest";
import {
  createInventoryReceiptSchema,
  updateInventoryReceiptSchema,
} from "../../models/inventory-receipt.model";

describe("createInventoryReceiptSchema", () => {
  const validItem = { productId: "00000000-0000-0000-0000-000000000001", quantity: 5 };
  const valid = { items: [validItem] };

  it("passes with valid data", () => {
    expect(createInventoryReceiptSchema.safeParse(valid).success).toBe(true);
  });

  it("passes with notes", () => {
    expect(createInventoryReceiptSchema.safeParse({ ...valid, notes: "Lote A" }).success).toBe(
      true,
    );
  });

  it("passes without notes — notes is optional", () => {
    expect(createInventoryReceiptSchema.safeParse({ items: [validItem] }).success).toBe(true);
  });

  it("fails with empty items array", () => {
    expect(createInventoryReceiptSchema.safeParse({ items: [] }).success).toBe(false);
  });

  it("fails when items is missing", () => {
    expect(createInventoryReceiptSchema.safeParse({}).success).toBe(false);
  });

  it("passes with multiple items", () => {
    const result = createInventoryReceiptSchema.safeParse({
      items: [validItem, { productId: "other-id", quantity: 3 }],
    });
    expect(result.success).toBe(true);
  });

  it("coerces quantity from string to number", () => {
    const result = createInventoryReceiptSchema.safeParse({
      items: [{ productId: "xxx", quantity: "10" }],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.items[0]!.quantity).toBe(10);
  });

  it("fails with zero quantity", () => {
    expect(
      createInventoryReceiptSchema.safeParse({ items: [{ ...validItem, quantity: 0 }] }).success,
    ).toBe(false);
  });

  it("fails with negative quantity", () => {
    expect(
      createInventoryReceiptSchema.safeParse({ items: [{ ...validItem, quantity: -1 }] }).success,
    ).toBe(false);
  });

  it("fails with fractional quantity", () => {
    expect(
      createInventoryReceiptSchema.safeParse({ items: [{ ...validItem, quantity: 1.5 }] }).success,
    ).toBe(false);
  });

  it("fails with empty productId", () => {
    expect(
      createInventoryReceiptSchema.safeParse({ items: [{ productId: "", quantity: 5 }] }).success,
    ).toBe(false);
  });
});

describe("updateInventoryReceiptSchema", () => {
  it("passes with empty object — all fields optional", () => {
    expect(updateInventoryReceiptSchema.safeParse({}).success).toBe(true);
  });

  it("passes with notes only", () => {
    expect(updateInventoryReceiptSchema.safeParse({ notes: "Updated notes" }).success).toBe(true);
  });

  it("passes with isActive false", () => {
    expect(updateInventoryReceiptSchema.safeParse({ isActive: false }).success).toBe(true);
  });

  it("passes with all fields", () => {
    expect(updateInventoryReceiptSchema.safeParse({ notes: "notes", isActive: true }).success).toBe(
      true,
    );
  });
});
