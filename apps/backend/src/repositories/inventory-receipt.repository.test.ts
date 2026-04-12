import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "../db/client";
import { createInventoryReceiptRepository } from "./inventory-receipt.repository";

// ── DB row fixtures ───────────────────────────────────────────────────────────

const receiptRow = {
  id: "00000000-0000-0000-0000-000000000001",
  notes: "Lote A",
  receivedById: "00000000-0000-0000-0000-000000000099",
  isActive: true,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: new Date("2024-01-01T00:00:00.000Z"),
};

const detailRow = {
  id: "00000000-0000-0000-0000-000000000002",
  receiptId: "00000000-0000-0000-0000-000000000001",
  productId: "00000000-0000-0000-0000-000000000003",
  quantity: 10,
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
  it("returns all receipts mapped to domain records", async () => {
    mockSelect.mockReturnValue(makeSelectChain([receiptRow]));

    const repo = createInventoryReceiptRepository(db);
    const result = await repo.findAll();

    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe(receiptRow.id);
    expect(result[0]!.notes).toBe("Lote A");
    expect(result[0]!.receivedById).toBe(receiptRow.receivedById);
    expect(result[0]!.createdAt).toBe("2024-01-01T00:00:00.000Z");
  });

  it("returns empty array when no receipts exist", async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));

    const repo = createInventoryReceiptRepository(db);
    const result = await repo.findAll();

    expect(result).toHaveLength(0);
  });

  it("applies isActive filter when provided", async () => {
    const chain = makeSelectChain([receiptRow]);
    mockSelect.mockReturnValue(chain);

    const repo = createInventoryReceiptRepository(db);
    await repo.findAll({ isActive: true });

    expect(chain.from().where).toHaveBeenCalled();
  });

  it("returns only inactive receipts when isActive=false filter is applied", async () => {
    const inactiveRow = { ...receiptRow, isActive: false };
    mockSelect.mockReturnValue(makeSelectChain([inactiveRow]));

    const repo = createInventoryReceiptRepository(db);
    const result = await repo.findAll({ isActive: false });

    expect(result).toHaveLength(1);
    expect(result[0]!.isActive).toBe(false);
  });
});

// ── findById ──────────────────────────────────────────────────────────────────

describe("findById", () => {
  it("returns mapped record when receipt exists", async () => {
    mockSelect.mockReturnValue(makeSelectChain([receiptRow]));

    const repo = createInventoryReceiptRepository(db);
    const result = await repo.findById(receiptRow.id);

    expect(result).toBeDefined();
    expect(result!.id).toBe(receiptRow.id);
    expect(result!.receivedById).toBe(receiptRow.receivedById);
  });

  it("returns undefined when receipt does not exist", async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));

    const repo = createInventoryReceiptRepository(db);
    const result = await repo.findById("non-existent");

    expect(result).toBeUndefined();
  });
});

// ── findDetailsByReceiptId ────────────────────────────────────────────────────

describe("findDetailsByReceiptId", () => {
  it("returns mapped detail records for a receipt", async () => {
    mockSelect.mockReturnValue(makeSelectChain([detailRow]));

    const repo = createInventoryReceiptRepository(db);
    const result = await repo.findDetailsByReceiptId(detailRow.receiptId);

    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe(detailRow.id);
    expect(result[0]!.quantity).toBe(10);
    expect(result[0]!.createdAt).toBe("2024-01-01T00:00:00.000Z");
  });

  it("returns empty array when receipt has no details", async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));

    const repo = createInventoryReceiptRepository(db);
    const result = await repo.findDetailsByReceiptId("non-existent");

    expect(result).toHaveLength(0);
  });
});

// ── findDetailsByReceiptIds ───────────────────────────────────────────────────

describe("findDetailsByReceiptIds", () => {
  it("returns details for multiple receipts using inArray", async () => {
    const detail2 = {
      ...detailRow,
      id: "00000000-0000-0000-0000-000000000004",
      receiptId: "00000000-0000-0000-0000-000000000005",
    };
    mockSelect.mockReturnValue(makeSelectChain([detailRow, detail2]));

    const repo = createInventoryReceiptRepository(db);
    const result = await repo.findDetailsByReceiptIds([receiptRow.id, detail2.receiptId]);

    expect(result).toHaveLength(2);
    expect(result[0]!.quantity).toBe(10);
  });

  it("returns empty array when ids array is empty (skips DB call)", async () => {
    const repo = createInventoryReceiptRepository(db);
    const result = await repo.findDetailsByReceiptIds([]);

    expect(result).toHaveLength(0);
    expect(mockSelect).not.toHaveBeenCalled();
  });
});

// ── findDetailById ────────────────────────────────────────────────────────────

describe("findDetailById", () => {
  it("returns mapped detail when found", async () => {
    mockSelect.mockReturnValue(makeSelectChain([detailRow]));

    const repo = createInventoryReceiptRepository(db);
    const result = await repo.findDetailById(detailRow.receiptId, detailRow.id);

    expect(result).toBeDefined();
    expect(result!.id).toBe(detailRow.id);
    expect(result!.quantity).toBe(10);
  });

  it("returns undefined when detail does not exist", async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));

    const repo = createInventoryReceiptRepository(db);
    const result = await repo.findDetailById("non-existent", "non-existent");

    expect(result).toBeUndefined();
  });

  it("applies compound AND condition (detailId AND receiptId)", async () => {
    const chain = makeSelectChain([detailRow]);
    mockSelect.mockReturnValue(chain);

    const repo = createInventoryReceiptRepository(db);
    await repo.findDetailById(detailRow.receiptId, detailRow.id);

    expect(chain.from().where).toHaveBeenCalled();
  });
});

// ── updateHeader ──────────────────────────────────────────────────────────────

describe("updateHeader", () => {
  it("updates notes and returns the modified record", async () => {
    const updatedRow = { ...receiptRow, notes: "Lote B" };
    mockUpdate.mockReturnValue(makeUpdateChain([updatedRow]));

    const repo = createInventoryReceiptRepository(db);
    const result = await repo.updateHeader(receiptRow.id, { notes: "Lote B" });

    expect(result).toBeDefined();
    expect(result!.notes).toBe("Lote B");
  });

  it("updates isActive and returns the modified record", async () => {
    const updatedRow = { ...receiptRow, isActive: false };
    mockUpdate.mockReturnValue(makeUpdateChain([updatedRow]));

    const repo = createInventoryReceiptRepository(db);
    const result = await repo.updateHeader(receiptRow.id, { isActive: false });

    expect(result).toBeDefined();
    expect(result!.isActive).toBe(false);
  });

  it("returns undefined when no row was matched", async () => {
    mockUpdate.mockReturnValue(makeUpdateChain([]));

    const repo = createInventoryReceiptRepository(db);
    const result = await repo.updateHeader("bad-id", { notes: "X" });

    expect(result).toBeUndefined();
  });
});

// ── updateDetail ──────────────────────────────────────────────────────────────

describe("updateDetail", () => {
  it("updates quantity and returns the modified detail", async () => {
    const updatedDetailRow = { ...detailRow, quantity: 15 };
    mockUpdate.mockReturnValue(makeUpdateChain([updatedDetailRow]));

    const repo = createInventoryReceiptRepository(db);
    const result = await repo.updateDetail(detailRow.id, { quantity: 15 });

    expect(result).toBeDefined();
    expect(result!.quantity).toBe(15);
  });

  it("returns undefined when no row was matched", async () => {
    mockUpdate.mockReturnValue(makeUpdateChain([]));

    const repo = createInventoryReceiptRepository(db);
    const result = await repo.updateDetail("bad-id", { quantity: 3 });

    expect(result).toBeUndefined();
  });
});

// ── softDelete ────────────────────────────────────────────────────────────────

describe("softDelete", () => {
  it("sets isActive to false and returns the updated record", async () => {
    const deletedRow = { ...receiptRow, isActive: false };
    mockUpdate.mockReturnValue(makeUpdateChain([deletedRow]));

    const repo = createInventoryReceiptRepository(db);
    const result = await repo.softDelete(receiptRow.id);

    expect(result).toBeDefined();
    expect(result!.isActive).toBe(false);
  });

  it("returns undefined when no row was matched", async () => {
    mockUpdate.mockReturnValue(makeUpdateChain([]));

    const repo = createInventoryReceiptRepository(db);
    const result = await repo.softDelete("bad-id");

    expect(result).toBeUndefined();
  });
});

// ── count ─────────────────────────────────────────────────────────────────────

describe("count", () => {
  it("returns total count of all receipts", async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ total: 3 }]));

    const repo = createInventoryReceiptRepository(db);
    const result = await repo.count();

    expect(result).toBe(3);
  });

  it("returns filtered count when isActive filter is provided", async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ total: 2 }]));

    const repo = createInventoryReceiptRepository(db);
    const result = await repo.count({ isActive: true });

    expect(result).toBe(2);
  });
});

// ── findPage ──────────────────────────────────────────────────────────────────

describe("findPage", () => {
  it("returns paginated receipt records without filter", async () => {
    mockSelect.mockReturnValue(makePaginatedSelectChain([receiptRow]));

    const repo = createInventoryReceiptRepository(db);
    const result = await repo.findPage(undefined, { limit: 20, offset: 0 });

    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe(receiptRow.id);
    expect(result[0]!.receivedById).toBe(receiptRow.receivedById);
  });

  it("applies isActive filter when provided", async () => {
    mockSelect.mockReturnValue(makePaginatedSelectChain([receiptRow]));

    const repo = createInventoryReceiptRepository(db);
    const result = await repo.findPage({ isActive: true }, { limit: 10, offset: 0 });

    expect(result).toHaveLength(1);
  });

  it("returns empty array when no records match", async () => {
    mockSelect.mockReturnValue(makePaginatedSelectChain([]));

    const repo = createInventoryReceiptRepository(db);
    const result = await repo.findPage(undefined, { limit: 20, offset: 0 });

    expect(result).toHaveLength(0);
  });
});
