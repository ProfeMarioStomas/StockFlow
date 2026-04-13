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

// Raw DB row shapes (returned by tx.insert/select inside transactions)
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

// ── Mock DB setup helpers ─────────────────────────────────────────────────────

function makeTxSelectChain(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(rows),
    }),
  };
}

function makeTxInsertChain(rows: unknown[]) {
  return {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(rows),
    }),
  };
}

function makeTxUpdateChain() {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    }),
  };
}

// ── Non-transactional db mock ─────────────────────────────────────────────────

const mockDb = {} as Parameters<typeof createInventoryReceiptService>[0];

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
  function makeMockTx() {
    return {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
    };
  }

  it("creates receipt, inserts details, increments stock, and invalidates cache", async () => {
    const mockTx = makeMockTx();
    const transactionalDb = {
      transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
    } as unknown as Parameters<typeof createInventoryReceiptService>[0];

    // 1. Product exists check
    mockTx.select.mockReturnValueOnce(makeTxSelectChain([productDbRow]));
    // 2. Insert receipt header
    mockTx.insert.mockReturnValueOnce(makeTxInsertChain([receiptDbRow]));
    // 3. Insert receipt details
    mockTx.insert.mockReturnValueOnce(makeTxInsertChain([detailDbRow]));
    // 4. Update product stock
    mockTx.update.mockReturnValueOnce(makeTxUpdateChain());

    const service = createInventoryReceiptService(transactionalDb);
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
    const mockTx = makeMockTx();
    const transactionalDb = {
      transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
    } as unknown as Parameters<typeof createInventoryReceiptService>[0];

    // Product not found
    mockTx.select.mockReturnValueOnce(makeTxSelectChain([]));

    const service = createInventoryReceiptService(transactionalDb);
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
  function makeMockTx() {
    return {
      select: vi.fn(),
      update: vi.fn(),
    };
  }

  it("updates detail quantity, applies stock delta, invalidates caches", async () => {
    const mockTx = makeMockTx();
    const transactionalDb = {
      transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
    } as unknown as Parameters<typeof createInventoryReceiptService>[0];

    const updatedDetailDbRow = { ...detailDbRow, quantity: 15 };

    // 1. Find existing detail
    mockTx.select.mockReturnValueOnce(makeTxSelectChain([detailDbRow]));
    // 2. Update detail
    mockTx.update.mockReturnValueOnce(makeTxUpdateChain());
    // 3. Update product stock (delta)
    mockTx.update.mockReturnValueOnce(makeTxUpdateChain());
    // 4. Fetch all details after update
    mockTx.select.mockReturnValueOnce(makeTxSelectChain([updatedDetailDbRow]));
    // 5. Fetch receipt header
    mockTx.select.mockReturnValueOnce(makeTxSelectChain([receiptDbRow]));

    const service = createInventoryReceiptService(transactionalDb);
    const result = await service.updateReceiptDetail(RECEIPT_ID, DETAIL_ID, { quantity: 15 });

    expect(result.details).toHaveLength(1);
    expect(result.details[0]!.quantity).toBe(15);
    expect(mockCacheStore.invalidate).toHaveBeenCalledWith(`receipts:${RECEIPT_ID}`);
    expect(mockCacheStore.invalidate).toHaveBeenCalledWith("receipts:list");
  });

  it("throws 404 when detail does not belong to the given receipt", async () => {
    const mockTx = makeMockTx();
    const transactionalDb = {
      transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
    } as unknown as Parameters<typeof createInventoryReceiptService>[0];

    // Detail not found
    mockTx.select.mockReturnValueOnce(makeTxSelectChain([]));

    const service = createInventoryReceiptService(transactionalDb);
    await expect(
      service.updateReceiptDetail(RECEIPT_ID, "bad-detail-id", { quantity: 5 }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

// ── deleteReceipt ─────────────────────────────────────────────────────────────

describe("deleteReceipt", () => {
  function makeMockTx() {
    return {
      select: vi.fn(),
      update: vi.fn(),
    };
  }

  it("soft-deletes receipt, reverts stock, and invalidates caches", async () => {
    const mockTx = makeMockTx();
    const transactionalDb = {
      transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
    } as unknown as Parameters<typeof createInventoryReceiptService>[0];

    // 1. Select receipt to verify exists
    mockTx.select.mockReturnValueOnce(makeTxSelectChain([receiptDbRow]));
    // 2. Select details for stock revert
    mockTx.select.mockReturnValueOnce(makeTxSelectChain([detailDbRow]));
    // 3. Soft-delete receipt
    mockTx.update.mockReturnValueOnce(makeTxUpdateChain());
    // 4. Revert product stock
    mockTx.update.mockReturnValueOnce(makeTxUpdateChain());

    const service = createInventoryReceiptService(transactionalDb);
    await service.deleteReceipt(RECEIPT_ID);

    expect(mockTx.update).toHaveBeenCalledTimes(2);
    expect(mockCacheStore.invalidate).toHaveBeenCalledWith(`receipts:${RECEIPT_ID}`);
    expect(mockCacheStore.invalidate).toHaveBeenCalledWith("receipts:list");
  });

  it("throws 404 when receipt does not exist", async () => {
    const mockTx = makeMockTx();
    const transactionalDb = {
      transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
    } as unknown as Parameters<typeof createInventoryReceiptService>[0];

    // Receipt not found
    mockTx.select.mockReturnValueOnce(makeTxSelectChain([]));

    const service = createInventoryReceiptService(transactionalDb);
    await expect(service.deleteReceipt("bad-id")).rejects.toMatchObject({ status: 404 });
  });
});
