import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "../db/client";
import { createSaleRepository } from "./sale.repository";

// ── DB row fixtures ───────────────────────────────────────────────────────────

const saleRow = {
  id: "00000000-0000-0000-0000-000000000001",
  totalAmount: "19.98",
  paymentMethod: "cash" as const,
  sellerId: "00000000-0000-0000-0000-000000000099",
  isActive: true,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: new Date("2024-01-01T00:00:00.000Z"),
};

const detailRow = {
  id: "00000000-0000-0000-0000-000000000002",
  saleId: "00000000-0000-0000-0000-000000000001",
  productId: "00000000-0000-0000-0000-000000000003",
  quantity: 2,
  unitPrice: "9.99",
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: new Date("2024-01-01T00:00:00.000Z"),
};

// ── Drizzle query builder helpers ─────────────────────────────────────────────

function makeSelectChain(rows: unknown[]) {
  const fromResult = {
    where: vi.fn().mockResolvedValue(rows),
    then: (resolve: (v: unknown) => void, reject?: (r: unknown) => void) =>
      Promise.resolve(rows).then(resolve, reject),
    catch: (onRejected: (r: unknown) => void) => Promise.resolve(rows).catch(onRejected),
  };
  return { from: vi.fn().mockReturnValue(fromResult) };
}

function makeUpdateChain(rows: unknown[]) {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(rows),
      }),
    }),
  };
}

function makePaginatedSelectChain(rows: unknown[]) {
  const offsetFn = vi.fn().mockResolvedValue(rows);
  const limitChain = { limit: vi.fn().mockReturnValue({ offset: offsetFn }) };
  const orderByChain = { orderBy: vi.fn().mockReturnValue(limitChain) };
  const fromResult = {
    where: vi.fn().mockReturnValue(orderByChain),
    ...orderByChain,
  };
  return { from: vi.fn().mockReturnValue(fromResult) };
}

// ── Test setup ────────────────────────────────────────────────────────────────

let mockSelect: ReturnType<typeof vi.fn>;
let mockUpdate: ReturnType<typeof vi.fn>;
let db: Database;

beforeEach(() => {
  mockSelect = vi.fn();
  mockUpdate = vi.fn();
  db = { select: mockSelect, update: mockUpdate } as unknown as Database;
});

// ── findAll ───────────────────────────────────────────────────────────────────

describe("findAll", () => {
  it("returns all sales mapped to domain records", async () => {
    mockSelect.mockReturnValue(makeSelectChain([saleRow]));

    const repo = createSaleRepository(db);
    const result = await repo.findAll();

    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe(saleRow.id);
    expect(result[0]!.totalAmount).toBe(19.98);
    expect(result[0]!.createdAt).toBe("2024-01-01T00:00:00.000Z");
  });

  it("returns empty array when no sales exist", async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));

    const repo = createSaleRepository(db);
    const result = await repo.findAll();

    expect(result).toHaveLength(0);
  });

  it("applies isActive filter when provided", async () => {
    const chain = makeSelectChain([saleRow]);
    mockSelect.mockReturnValue(chain);

    const repo = createSaleRepository(db);
    await repo.findAll({ isActive: true });

    expect(chain.from().where).toHaveBeenCalled();
  });

  it("returns only inactive sales when isActive=false filter is applied", async () => {
    const inactiveRow = { ...saleRow, isActive: false };
    mockSelect.mockReturnValue(makeSelectChain([inactiveRow]));

    const repo = createSaleRepository(db);
    const result = await repo.findAll({ isActive: false });

    expect(result).toHaveLength(1);
    expect(result[0]!.isActive).toBe(false);
  });
});

// ── findById ─────────────────────────────────────────────────────────────────

describe("findById", () => {
  it("returns mapped record when sale exists", async () => {
    mockSelect.mockReturnValue(makeSelectChain([saleRow]));

    const repo = createSaleRepository(db);
    const result = await repo.findById(saleRow.id);

    expect(result).toBeDefined();
    expect(result!.id).toBe(saleRow.id);
    expect(result!.totalAmount).toBe(19.98);
  });

  it("returns undefined when sale does not exist", async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));

    const repo = createSaleRepository(db);
    const result = await repo.findById("non-existent");

    expect(result).toBeUndefined();
  });
});

// ── findDetailsBySaleId ───────────────────────────────────────────────────────

describe("findDetailsBySaleId", () => {
  it("returns mapped detail records for a sale", async () => {
    mockSelect.mockReturnValue(makeSelectChain([detailRow]));

    const repo = createSaleRepository(db);
    const result = await repo.findDetailsBySaleId(detailRow.saleId);

    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe(detailRow.id);
    expect(result[0]!.unitPrice).toBe(9.99);
    expect(result[0]!.createdAt).toBe("2024-01-01T00:00:00.000Z");
  });

  it("returns empty array when sale has no details", async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));

    const repo = createSaleRepository(db);
    const result = await repo.findDetailsBySaleId("non-existent");

    expect(result).toHaveLength(0);
  });
});

// ── findDetailsBySaleIds ──────────────────────────────────────────────────────

describe("findDetailsBySaleIds", () => {
  it("returns details for multiple sales using inArray", async () => {
    const detail2 = {
      ...detailRow,
      id: "00000000-0000-0000-0000-000000000004",
      saleId: "00000000-0000-0000-0000-000000000005",
    };
    mockSelect.mockReturnValue(makeSelectChain([detailRow, detail2]));

    const repo = createSaleRepository(db);
    const result = await repo.findDetailsBySaleIds([saleRow.id, detail2.saleId]);

    expect(result).toHaveLength(2);
    expect(result[0]!.unitPrice).toBe(9.99);
  });

  it("returns empty array when ids array is empty (skips DB call)", async () => {
    const repo = createSaleRepository(db);
    const result = await repo.findDetailsBySaleIds([]);

    expect(result).toHaveLength(0);
    expect(mockSelect).not.toHaveBeenCalled();
  });
});

// ── findDetailById ────────────────────────────────────────────────────────────

describe("findDetailById", () => {
  it("returns mapped detail when found", async () => {
    mockSelect.mockReturnValue(makeSelectChain([detailRow]));

    const repo = createSaleRepository(db);
    const result = await repo.findDetailById(detailRow.saleId, detailRow.id);

    expect(result).toBeDefined();
    expect(result!.id).toBe(detailRow.id);
    expect(result!.unitPrice).toBe(9.99);
  });

  it("returns undefined when detail does not exist", async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));

    const repo = createSaleRepository(db);
    const result = await repo.findDetailById("non-existent", "non-existent");

    expect(result).toBeUndefined();
  });

  it("applies compound AND condition (detailId AND saleId)", async () => {
    const chain = makeSelectChain([detailRow]);
    mockSelect.mockReturnValue(chain);

    const repo = createSaleRepository(db);
    await repo.findDetailById(detailRow.saleId, detailRow.id);

    expect(chain.from().where).toHaveBeenCalled();
  });
});

// ── updateHeader ──────────────────────────────────────────────────────────────

describe("updateHeader", () => {
  it("updates paymentMethod and returns the modified record", async () => {
    const updatedRow = { ...saleRow, paymentMethod: "card" as const };
    mockUpdate.mockReturnValue(makeUpdateChain([updatedRow]));

    const repo = createSaleRepository(db);
    const result = await repo.updateHeader(saleRow.id, { paymentMethod: "card" });

    expect(result).toBeDefined();
    expect(result!.paymentMethod).toBe("card");
  });

  it("updates isActive and returns the modified record", async () => {
    const updatedRow = { ...saleRow, isActive: false };
    mockUpdate.mockReturnValue(makeUpdateChain([updatedRow]));

    const repo = createSaleRepository(db);
    const result = await repo.updateHeader(saleRow.id, { isActive: false });

    expect(result).toBeDefined();
    expect(result!.isActive).toBe(false);
  });

  it("returns undefined when no row was matched", async () => {
    mockUpdate.mockReturnValue(makeUpdateChain([]));

    const repo = createSaleRepository(db);
    const result = await repo.updateHeader("bad-id", { paymentMethod: "card" });

    expect(result).toBeUndefined();
  });
});

// ── updateDetail ──────────────────────────────────────────────────────────────

describe("updateDetail", () => {
  it("updates quantity and returns the modified detail", async () => {
    const updatedDetailRow = { ...detailRow, quantity: 5 };
    mockUpdate.mockReturnValue(makeUpdateChain([updatedDetailRow]));

    const repo = createSaleRepository(db);
    const result = await repo.updateDetail(detailRow.id, { quantity: 5 });

    expect(result).toBeDefined();
    expect(result!.quantity).toBe(5);
  });

  it("updates unitPrice converting to string for DB and parsing back on return", async () => {
    const updatedDetailRow = { ...detailRow, unitPrice: "12.99" };
    mockUpdate.mockReturnValue(makeUpdateChain([updatedDetailRow]));

    const repo = createSaleRepository(db);
    const result = await repo.updateDetail(detailRow.id, { unitPrice: 12.99 });

    expect(result).toBeDefined();
    expect(result!.unitPrice).toBe(12.99);
  });

  it("returns undefined when no row was matched", async () => {
    mockUpdate.mockReturnValue(makeUpdateChain([]));

    const repo = createSaleRepository(db);
    const result = await repo.updateDetail("bad-id", { quantity: 3 });

    expect(result).toBeUndefined();
  });
});

// ── updateTotalAmount ─────────────────────────────────────────────────────────

describe("updateTotalAmount", () => {
  it("updates totalAmount and returns the mapped record", async () => {
    const updatedRow = { ...saleRow, totalAmount: "49.95" };
    mockUpdate.mockReturnValue(makeUpdateChain([updatedRow]));

    const repo = createSaleRepository(db);
    const result = await repo.updateTotalAmount(saleRow.id, 49.95);

    expect(result).toBeDefined();
    expect(result!.totalAmount).toBe(49.95);
  });

  it("returns undefined when no row was matched", async () => {
    mockUpdate.mockReturnValue(makeUpdateChain([]));

    const repo = createSaleRepository(db);
    const result = await repo.updateTotalAmount("bad-id", 10);

    expect(result).toBeUndefined();
  });
});

// ── softDelete ────────────────────────────────────────────────────────────────

describe("softDelete", () => {
  it("sets isActive to false and returns the updated record", async () => {
    const deletedRow = { ...saleRow, isActive: false };
    mockUpdate.mockReturnValue(makeUpdateChain([deletedRow]));

    const repo = createSaleRepository(db);
    const result = await repo.softDelete(saleRow.id);

    expect(result).toBeDefined();
    expect(result!.isActive).toBe(false);
  });

  it("returns undefined when no row was matched", async () => {
    mockUpdate.mockReturnValue(makeUpdateChain([]));

    const repo = createSaleRepository(db);
    const result = await repo.softDelete("bad-id");

    expect(result).toBeUndefined();
  });
});

// ── count ─────────────────────────────────────────────────────────────────────

describe("count", () => {
  it("returns total count of all sales", async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ total: 7 }]));

    const repo = createSaleRepository(db);
    const result = await repo.count();

    expect(result).toBe(7);
  });

  it("returns filtered count when isActive filter is provided", async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ total: 4 }]));

    const repo = createSaleRepository(db);
    const result = await repo.count({ isActive: true });

    expect(result).toBe(4);
  });
});

// ── findPage ──────────────────────────────────────────────────────────────────

describe("findPage", () => {
  it("returns paginated sale records without filter", async () => {
    mockSelect.mockReturnValue(makePaginatedSelectChain([saleRow]));

    const repo = createSaleRepository(db);
    const result = await repo.findPage(undefined, { limit: 20, offset: 0 });

    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe(saleRow.id);
    expect(result[0]!.totalAmount).toBe(19.98);
  });

  it("applies isActive filter when provided", async () => {
    mockSelect.mockReturnValue(makePaginatedSelectChain([saleRow]));

    const repo = createSaleRepository(db);
    const result = await repo.findPage({ isActive: true }, { limit: 10, offset: 0 });

    expect(result).toHaveLength(1);
  });

  it("returns empty array when no records match", async () => {
    mockSelect.mockReturnValue(makePaginatedSelectChain([]));

    const repo = createSaleRepository(db);
    const result = await repo.findPage(undefined, { limit: 20, offset: 0 });

    expect(result).toHaveLength(0);
  });
});
