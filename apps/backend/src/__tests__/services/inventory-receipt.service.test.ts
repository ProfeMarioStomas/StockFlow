import { HTTPException } from "hono/http-exception";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Hoisted mocks (available before module imports) ───────────────────────────

const { mockRepo, mockCacheStore } = vi.hoisted(() => ({
  mockRepo: {
    findAll: vi.fn(),
    findById: vi.fn(),
    findPage: vi.fn(),
    count: vi.fn(),
    findDetailsByReceiptId: vi.fn(),
    findDetailsByReceiptIds: vi.fn(),
    findDetailById: vi.fn(),
    updateHeader: vi.fn(),
    updateDetail: vi.fn(),
    softDelete: vi.fn(),
  },
  mockCacheStore: {
    get: vi.fn(),
    set: vi.fn(),
    invalidate: vi.fn(),
    invalidatePrefix: vi.fn(),
  },
}));

vi.mock("../../repositories/inventory-receipt.repository", () => ({
  createInventoryReceiptRepository: () => mockRepo,
}));

vi.mock("../../lib/cache", () => ({
  cache: mockCacheStore,
}));

// ── Module under test (imported AFTER mocks) ──────────────────────────────────

import { createInventoryReceiptService } from "../../services/inventory-receipt.service";

// ── Test fixtures ─────────────────────────────────────────────────────────────

const RECEIVED_BY_ID = "00000000-0000-0000-0000-000000000099";
const RECEIPT_ID = "00000000-0000-0000-0000-000000000001";
const DETAIL_ID = "00000000-0000-0000-0000-000000000002";
const PRODUCT_ID = "00000000-0000-0000-0000-000000000003";

const receiptRecord = {
  id: RECEIPT_ID,
  notes: "Lote A",
  receivedById: RECEIVED_BY_ID,
  isActive: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const detailRecord = {
  id: DETAIL_ID,
  receiptId: RECEIPT_ID,
  productId: PRODUCT_ID,
  quantity: 10,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

// Raw DB row shapes (returned by db.insert/select)
const receiptDbRow = {
  id: RECEIPT_ID,
  notes: "Lote A",
  receivedById: RECEIVED_BY_ID,
  isActive: true,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: new Date("2024-01-01T00:00:00.000Z"),
};

const detailDbRow = {
  id: DETAIL_ID,
  receiptId: RECEIPT_ID,
  productId: PRODUCT_ID,
  quantity: 10,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: new Date("2024-01-01T00:00:00.000Z"),
};

const productDbRow = {
  id: PRODUCT_ID,
  name: "Widget",
  price: "9.99",
  stock: 5,
  isActive: true,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: new Date("2024-01-01T00:00:00.000Z"),
};

// ── DB mock helpers ───────────────────────────────────────────────────────────
//
// The services use db.select/insert/update/batch() directly (no transaction),
// because neon-http does not support db.transaction().
//
// Two kinds of chains:
//   - "awaited directly" → the terminal method returns a Promise
//   - "into batch"       → the terminal method returns an opaque placeholder;
//                          db.batch() is mocked separately to return the result

/** Awaited directly: db.select().from(X).where(Y) → rows[] */
function makeSelectChain(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(rows),
    }),
  };
}

/** Awaited directly: db.insert(X).values(Y).returning() → rows[] */
function makeInsertChain(rows: unknown[]) {
  return {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(rows),
    }),
  };
}

/** Passed to db.batch(): db.insert(X).values(Y).returning() → opaque placeholder */
function makeBatchInsertChain() {
  return {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockReturnValue({}),
    }),
  };
}

/** Passed to db.batch(): db.update(X).set(Y).where(Z) → opaque placeholder */
function makeBatchUpdateChain() {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({}),
    }),
  };
}

// ── Mock db factory ───────────────────────────────────────────────────────────

function makeMockDb() {
  return {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    batch: vi.fn(),
  };
}

// Shared mockDb for tests that only use the repository (list/get/header ops)
const mockDb = makeMockDb() as unknown as Parameters<typeof createInventoryReceiptService>[0];

// ── beforeEach ────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ── listReceipts ──────────────────────────────────────────────────────────────

describe("listReceipts", () => {
  it("returns paginated response with embedded details", async () => {
    mockRepo.findPage.mockResolvedValue([receiptRecord]);
    mockRepo.count.mockResolvedValue(1);
    mockRepo.findDetailsByReceiptIds.mockResolvedValue([detailRecord]);

    const service = createInventoryReceiptService(mockDb);
    const result = await service.listReceipts();

    expect(mockRepo.findPage).toHaveBeenCalledOnce();
    expect(mockRepo.count).toHaveBeenCalledOnce();
    expect(mockRepo.findDetailsByReceiptIds).toHaveBeenCalledWith([RECEIPT_ID]);
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.details).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(result.meta.page).toBe(1);
  });

  it("passes isActive filter to findPage and count", async () => {
    mockRepo.findPage.mockResolvedValue([]);
    mockRepo.count.mockResolvedValue(0);
    mockRepo.findDetailsByReceiptIds.mockResolvedValue([]);

    const service = createInventoryReceiptService(mockDb);
    await service.listReceipts({ isActive: false });

    expect(mockRepo.findPage).toHaveBeenCalledWith({ isActive: false }, expect.any(Object));
    expect(mockRepo.count).toHaveBeenCalledWith({ isActive: false });
  });

  it("calculates totalPages correctly", async () => {
    mockRepo.findPage.mockResolvedValue([receiptRecord]);
    mockRepo.count.mockResolvedValue(60);
    mockRepo.findDetailsByReceiptIds.mockResolvedValue([]);

    const service = createInventoryReceiptService(mockDb);
    const result = await service.listReceipts(undefined, 1, 20);

    expect(result.meta.totalPages).toBe(3);
    expect(result.meta.total).toBe(60);
  });
});

// ── getReceiptById ────────────────────────────────────────────────────────────

describe("getReceiptById", () => {
  it("returns cached receipt on cache hit", async () => {
    const cached = { ...receiptRecord, details: [detailRecord] };
    mockCacheStore.get.mockReturnValue(cached);

    const service = createInventoryReceiptService(mockDb);
    const result = await service.getReceiptById(RECEIPT_ID);

    expect(result).toBe(cached);
    expect(mockRepo.findById).not.toHaveBeenCalled();
  });

  it("fetches from DB, embeds details, and caches when not in cache", async () => {
    mockCacheStore.get.mockReturnValue(undefined);
    mockRepo.findById.mockResolvedValue(receiptRecord);
    mockRepo.findDetailsByReceiptId.mockResolvedValue([detailRecord]);

    const service = createInventoryReceiptService(mockDb);
    const result = await service.getReceiptById(RECEIPT_ID);

    expect(mockRepo.findById).toHaveBeenCalledWith(RECEIPT_ID);
    expect(mockRepo.findDetailsByReceiptId).toHaveBeenCalledWith(RECEIPT_ID);
    expect(mockCacheStore.set).toHaveBeenCalledWith(
      `receipts:${RECEIPT_ID}`,
      expect.any(Object),
      expect.any(Number),
    );
    expect(result.receivedById).toBe(RECEIVED_BY_ID);
    expect(result.details).toHaveLength(1);
  });

  it("throws 404 when receipt does not exist", async () => {
    mockCacheStore.get.mockReturnValue(undefined);
    mockRepo.findById.mockResolvedValue(undefined);

    const service = createInventoryReceiptService(mockDb);
    await expect(service.getReceiptById("non-existent")).rejects.toThrow(HTTPException);
    await expect(service.getReceiptById("non-existent")).rejects.toMatchObject({ status: 404 });
  });
});

// ── createReceipt ─────────────────────────────────────────────────────────────

describe("createReceipt", () => {
  it("creates receipt, inserts details, increments stock, and invalidates cache", async () => {
    const db = makeMockDb() as unknown as Parameters<typeof createInventoryReceiptService>[0];
    const d = db as unknown as ReturnType<typeof makeMockDb>;

    // 1. Product exists check: db.select().from().where() → [productDbRow]
    d.select.mockReturnValueOnce(makeSelectChain([productDbRow]));
    // 2. Insert receipt header: db.insert().values().returning() → [receiptDbRow]
    d.insert.mockReturnValueOnce(makeInsertChain([receiptDbRow]));
    // 3. Batch: insert details (placeholder) + update stock (placeholder)
    d.insert.mockReturnValueOnce(makeBatchInsertChain());
    d.update.mockReturnValueOnce(makeBatchUpdateChain());
    d.batch.mockResolvedValueOnce([[detailDbRow], []]);

    const service = createInventoryReceiptService(db);
    const result = await service.createReceipt(
      { notes: "Lote A", items: [{ productId: PRODUCT_ID, quantity: 10 }] },
      RECEIVED_BY_ID,
    );

    expect(result.receivedById).toBe(RECEIVED_BY_ID);
    expect(result.notes).toBe("Lote A");
    expect(result.details).toHaveLength(1);
    expect(result.details[0]!.quantity).toBe(10);
    expect(mockCacheStore.invalidate).toHaveBeenCalledWith("receipts:list");
  });

  it("throws 404 when a product does not exist", async () => {
    const db = makeMockDb() as unknown as Parameters<typeof createInventoryReceiptService>[0];
    const d = db as unknown as ReturnType<typeof makeMockDb>;

    // Product not found
    d.select.mockReturnValueOnce(makeSelectChain([]));

    const service = createInventoryReceiptService(db);
    await expect(
      service.createReceipt({ items: [{ productId: PRODUCT_ID, quantity: 10 }] }, RECEIVED_BY_ID),
    ).rejects.toMatchObject({ status: 404 });
  });
});

// ── updateReceiptHeader ───────────────────────────────────────────────────────

describe("updateReceiptHeader", () => {
  it("updates header, invalidates caches, and returns composed response", async () => {
    const updatedRecord = { ...receiptRecord, notes: "Lote B" };
    mockRepo.findById.mockResolvedValue(receiptRecord);
    mockRepo.updateHeader.mockResolvedValue(updatedRecord);
    mockRepo.findDetailsByReceiptId.mockResolvedValue([detailRecord]);

    const service = createInventoryReceiptService(mockDb);
    const result = await service.updateReceiptHeader(RECEIPT_ID, { notes: "Lote B" });

    expect(result.notes).toBe("Lote B");
    expect(result.details).toHaveLength(1);
    expect(mockCacheStore.invalidate).toHaveBeenCalledWith(`receipts:${RECEIPT_ID}`);
    expect(mockCacheStore.invalidate).toHaveBeenCalledWith("receipts:list");
  });

  it("throws 404 when receipt does not exist", async () => {
    mockRepo.findById.mockResolvedValue(undefined);

    const service = createInventoryReceiptService(mockDb);
    await expect(service.updateReceiptHeader("bad-id", { notes: "X" })).rejects.toMatchObject({
      status: 404,
    });
  });
});

// ── updateReceiptDetail ───────────────────────────────────────────────────────

describe("updateReceiptDetail", () => {
  it("updates detail quantity, applies stock delta, invalidates caches", async () => {
    const db = makeMockDb() as unknown as Parameters<typeof createInventoryReceiptService>[0];
    const d = db as unknown as ReturnType<typeof makeMockDb>;

    const updatedDetailDbRow = { ...detailDbRow, quantity: 15 };

    // 1. Find existing detail: db.select().from().where() → [detailDbRow]
    d.select.mockReturnValueOnce(makeSelectChain([detailDbRow]));
    // 2. Batch: update detail + update stock (both placeholders)
    d.update.mockReturnValueOnce(makeBatchUpdateChain());
    d.update.mockReturnValueOnce(makeBatchUpdateChain());
    d.batch.mockResolvedValueOnce([[], []]);
    // 3. Fetch updated state (Promise.all of two selects)
    d.select.mockReturnValueOnce(makeSelectChain([updatedDetailDbRow])); // all details
    d.select.mockReturnValueOnce(makeSelectChain([receiptDbRow])); // receipt header

    const service = createInventoryReceiptService(db);
    const result = await service.updateReceiptDetail(RECEIPT_ID, DETAIL_ID, { quantity: 15 });

    expect(result.details).toHaveLength(1);
    expect(result.details[0]!.quantity).toBe(15);
    expect(mockCacheStore.invalidate).toHaveBeenCalledWith(`receipts:${RECEIPT_ID}`);
    expect(mockCacheStore.invalidate).toHaveBeenCalledWith("receipts:list");
  });

  it("throws 404 when detail does not belong to the given receipt", async () => {
    const db = makeMockDb() as unknown as Parameters<typeof createInventoryReceiptService>[0];
    const d = db as unknown as ReturnType<typeof makeMockDb>;

    // Detail not found
    d.select.mockReturnValueOnce(makeSelectChain([]));

    const service = createInventoryReceiptService(db);
    await expect(
      service.updateReceiptDetail(RECEIPT_ID, "bad-detail-id", { quantity: 5 }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

// ── deleteReceipt ─────────────────────────────────────────────────────────────

describe("deleteReceipt", () => {
  it("soft-deletes receipt, reverts stock, and invalidates caches", async () => {
    const db = makeMockDb() as unknown as Parameters<typeof createInventoryReceiptService>[0];
    const d = db as unknown as ReturnType<typeof makeMockDb>;

    // 1. Select receipt + details in parallel (Promise.all)
    d.select
      .mockReturnValueOnce(makeSelectChain([receiptDbRow]))
      .mockReturnValueOnce(makeSelectChain([detailDbRow]));
    // 2. Batch: soft-delete receipt + revert stock (both placeholders)
    d.update.mockReturnValueOnce(makeBatchUpdateChain());
    d.update.mockReturnValueOnce(makeBatchUpdateChain());
    d.batch.mockResolvedValueOnce([[], []]);

    const service = createInventoryReceiptService(db);
    await service.deleteReceipt(RECEIPT_ID);

    expect(d.update).toHaveBeenCalledTimes(2);
    expect(mockCacheStore.invalidate).toHaveBeenCalledWith(`receipts:${RECEIPT_ID}`);
    expect(mockCacheStore.invalidate).toHaveBeenCalledWith("receipts:list");
  });

  it("throws 404 when receipt does not exist", async () => {
    const db = makeMockDb() as unknown as Parameters<typeof createInventoryReceiptService>[0];
    const d = db as unknown as ReturnType<typeof makeMockDb>;

    // Both selects run (Promise.all) — receipt returns empty
    d.select.mockReturnValueOnce(makeSelectChain([])).mockReturnValueOnce(makeSelectChain([]));

    const service = createInventoryReceiptService(db);
    await expect(service.deleteReceipt("bad-id")).rejects.toMatchObject({ status: 404 });
  });
});
