import { HTTPException } from "hono/http-exception";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Hoisted mocks (available before module imports) ───────────────────────────

const { mockRepo, mockCacheStore } = vi.hoisted(() => ({
  mockRepo: {
    findAll: vi.fn(),
    findById: vi.fn(),
    findPage: vi.fn(),
    count: vi.fn(),
    findDetailsBySaleId: vi.fn(),
    findDetailsBySaleIds: vi.fn(),
    findDetailById: vi.fn(),
    updateHeader: vi.fn(),
    updateDetail: vi.fn(),
    updateTotalAmount: vi.fn(),
    softDelete: vi.fn(),
  },
  mockCacheStore: {
    get: vi.fn(),
    set: vi.fn(),
    invalidate: vi.fn(),
    invalidatePrefix: vi.fn(),
  },
}));

vi.mock("../repositories/sale.repository", () => ({
  createSaleRepository: () => mockRepo,
}));

vi.mock("../lib/cache", () => ({
  cache: mockCacheStore,
}));

// ── Module under test (imported AFTER mocks) ──────────────────────────────────

import { createSaleService } from "./sale.service";

// ── Test fixtures ─────────────────────────────────────────────────────────────

const SELLER_ID = "00000000-0000-0000-0000-000000000099";
const SALE_ID = "00000000-0000-0000-0000-000000000001";
const DETAIL_ID = "00000000-0000-0000-0000-000000000002";
const PRODUCT_ID = "00000000-0000-0000-0000-000000000003";

const saleRecord = {
  id: SALE_ID,
  totalAmount: 19.98,
  paymentMethod: "cash" as const,
  sellerId: SELLER_ID,
  isActive: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const detailRecord = {
  id: DETAIL_ID,
  saleId: SALE_ID,
  productId: PRODUCT_ID,
  quantity: 2,
  unitPrice: 9.99,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

// Raw DB row shapes (returned by tx.insert/select inside transactions)
const saleDbRow = {
  id: SALE_ID,
  totalAmount: "19.98",
  paymentMethod: "cash" as const,
  sellerId: SELLER_ID,
  isActive: true,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: new Date("2024-01-01T00:00:00.000Z"),
};

const detailDbRow = {
  id: DETAIL_ID,
  saleId: SALE_ID,
  productId: PRODUCT_ID,
  quantity: 2,
  unitPrice: "9.99",
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: new Date("2024-01-01T00:00:00.000Z"),
};

const productDbRow = {
  id: PRODUCT_ID,
  name: "Widget",
  price: "9.99",
  stock: 10,
  isActive: true,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: new Date("2024-01-01T00:00:00.000Z"),
};

// ── Mock DB setup helpers ─────────────────────────────────────────────────────

/** Builds a mock tx.select().from(X).where(Y) chain returning given rows */
function makeTxSelectChain(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(rows),
    }),
  };
}

/** Builds a mock tx.insert(X).values(Y).returning() chain returning given rows */
function makeTxInsertChain(rows: unknown[]) {
  return {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(rows),
    }),
  };
}

/** Builds a mock tx.update(X).set(Y).where(Z) chain (no returning, for stock updates) */
function makeTxUpdateChain() {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    }),
  };
}

/** Builds a mock tx.update(X).set(Y).where(Z).returning() chain */
function makeTxUpdateReturningChain(rows: unknown[]) {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(rows),
      }),
    }),
  };
}

// ── Non-transactional db mock (repo handles DB) ───────────────────────────────
const mockDb = {} as Parameters<typeof createSaleService>[0];

// ── beforeEach ────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ── listSales ─────────────────────────────────────────────────────────────────

describe("listSales", () => {
  it("returns paginated response with embedded details", async () => {
    mockRepo.findPage.mockResolvedValue([saleRecord]);
    mockRepo.count.mockResolvedValue(1);
    mockRepo.findDetailsBySaleIds.mockResolvedValue([detailRecord]);

    const service = createSaleService(mockDb);
    const result = await service.listSales();

    expect(mockRepo.findPage).toHaveBeenCalledOnce();
    expect(mockRepo.count).toHaveBeenCalledOnce();
    expect(mockRepo.findDetailsBySaleIds).toHaveBeenCalledWith([SALE_ID]);
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.details).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(result.meta.page).toBe(1);
  });

  it("passes isActive filter to findPage and count", async () => {
    mockRepo.findPage.mockResolvedValue([]);
    mockRepo.count.mockResolvedValue(0);
    mockRepo.findDetailsBySaleIds.mockResolvedValue([]);

    const service = createSaleService(mockDb);
    await service.listSales({ isActive: false });

    expect(mockRepo.findPage).toHaveBeenCalledWith({ isActive: false }, expect.any(Object));
    expect(mockRepo.count).toHaveBeenCalledWith({ isActive: false });
  });

  it("calculates totalPages correctly", async () => {
    mockRepo.findPage.mockResolvedValue([saleRecord]);
    mockRepo.count.mockResolvedValue(100);
    mockRepo.findDetailsBySaleIds.mockResolvedValue([]);

    const service = createSaleService(mockDb);
    const result = await service.listSales(undefined, 1, 20);

    expect(result.meta.totalPages).toBe(5);
    expect(result.meta.total).toBe(100);
  });
});

// ── getSaleById ───────────────────────────────────────────────────────────────

describe("getSaleById", () => {
  it("returns cached sale on cache hit", async () => {
    const cached = { ...saleRecord, details: [detailRecord] };
    mockCacheStore.get.mockReturnValue(cached);

    const service = createSaleService(mockDb);
    const result = await service.getSaleById(SALE_ID);

    expect(result).toBe(cached);
    expect(mockRepo.findById).not.toHaveBeenCalled();
  });

  it("fetches from DB, embeds details, and caches when not in cache", async () => {
    mockCacheStore.get.mockReturnValue(undefined);
    mockRepo.findById.mockResolvedValue(saleRecord);
    mockRepo.findDetailsBySaleId.mockResolvedValue([detailRecord]);

    const service = createSaleService(mockDb);
    const result = await service.getSaleById(SALE_ID);

    expect(mockRepo.findById).toHaveBeenCalledWith(SALE_ID);
    expect(mockRepo.findDetailsBySaleId).toHaveBeenCalledWith(SALE_ID);
    expect(mockCacheStore.set).toHaveBeenCalledWith(
      `sales:${SALE_ID}`,
      expect.any(Object),
      expect.any(Number),
    );
    expect(result.totalAmount).toBe(19.98);
    expect(result.details).toHaveLength(1);
  });

  it("throws 404 when sale does not exist", async () => {
    mockCacheStore.get.mockReturnValue(undefined);
    mockRepo.findById.mockResolvedValue(undefined);

    const service = createSaleService(mockDb);
    await expect(service.getSaleById("non-existent")).rejects.toThrow(HTTPException);
    await expect(service.getSaleById("non-existent")).rejects.toMatchObject({ status: 404 });
  });
});

// ── createSale ────────────────────────────────────────────────────────────────

describe("createSale", () => {
  function makeMockTx() {
    const mockTx = {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
    };
    return mockTx;
  }

  it("creates sale, calculates totalAmount, decrements stock, and invalidates cache", async () => {
    const mockTx = makeMockTx();
    const transactionalDb = {
      transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
    } as unknown as Parameters<typeof createSaleService>[0];

    // 1. Product stock check
    mockTx.select.mockReturnValueOnce(makeTxSelectChain([productDbRow]));
    // 2. Insert sale
    mockTx.insert.mockReturnValueOnce(makeTxInsertChain([saleDbRow]));
    // 3. Insert sale details
    mockTx.insert.mockReturnValueOnce(makeTxInsertChain([detailDbRow]));
    // 4. Update product stock (no returning)
    mockTx.update.mockReturnValueOnce(makeTxUpdateChain());

    const service = createSaleService(transactionalDb);
    const result = await service.createSale(
      { paymentMethod: "cash", items: [{ productId: PRODUCT_ID, quantity: 2, unitPrice: 9.99 }] },
      SELLER_ID,
    );

    expect(result.totalAmount).toBe(19.98);
    expect(result.paymentMethod).toBe("cash");
    expect(result.sellerId).toBe(SELLER_ID);
    expect(result.details).toHaveLength(1);
    expect(result.details[0]!.unitPrice).toBe(9.99);
    expect(mockCacheStore.invalidate).toHaveBeenCalledWith("sales:list");
  });

  it("throws 404 when a product does not exist", async () => {
    const mockTx = makeMockTx();
    const transactionalDb = {
      transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
    } as unknown as Parameters<typeof createSaleService>[0];

    // Product not found
    mockTx.select.mockReturnValueOnce(makeTxSelectChain([]));

    const service = createSaleService(transactionalDb);
    await expect(
      service.createSale(
        { paymentMethod: "cash", items: [{ productId: PRODUCT_ID, quantity: 2, unitPrice: 9.99 }] },
        SELLER_ID,
      ),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("throws 409 when product has insufficient stock", async () => {
    const mockTx = makeMockTx();
    const transactionalDb = {
      transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
    } as unknown as Parameters<typeof createSaleService>[0];

    // Product exists but stock too low
    mockTx.select.mockReturnValueOnce(makeTxSelectChain([{ ...productDbRow, stock: 1 }]));

    const service = createSaleService(transactionalDb);
    await expect(
      service.createSale(
        { paymentMethod: "cash", items: [{ productId: PRODUCT_ID, quantity: 5, unitPrice: 9.99 }] },
        SELLER_ID,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
});

// ── updateSaleHeader ──────────────────────────────────────────────────────────

describe("updateSaleHeader", () => {
  it("updates header, invalidates caches, and returns composed response", async () => {
    const updatedRecord = { ...saleRecord, paymentMethod: "card" as const };
    mockRepo.findById.mockResolvedValue(saleRecord);
    mockRepo.updateHeader.mockResolvedValue(updatedRecord);
    mockRepo.findDetailsBySaleId.mockResolvedValue([detailRecord]);

    const service = createSaleService(mockDb);
    const result = await service.updateSaleHeader(SALE_ID, { paymentMethod: "card" });

    expect(result.paymentMethod).toBe("card");
    expect(result.details).toHaveLength(1);
    expect(mockCacheStore.invalidate).toHaveBeenCalledWith(`sales:${SALE_ID}`);
    expect(mockCacheStore.invalidate).toHaveBeenCalledWith("sales:list");
  });

  it("throws 404 when sale does not exist", async () => {
    mockRepo.findById.mockResolvedValue(undefined);

    const service = createSaleService(mockDb);
    await expect(
      service.updateSaleHeader("bad-id", { paymentMethod: "card" }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

// ── updateSaleDetail ──────────────────────────────────────────────────────────

describe("updateSaleDetail", () => {
  function makeMockTx() {
    return {
      select: vi.fn(),
      update: vi.fn(),
    };
  }

  it("updates detail, recalculates totalAmount, invalidates caches", async () => {
    const mockTx = makeMockTx();
    const transactionalDb = {
      transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
    } as unknown as Parameters<typeof createSaleService>[0];

    const updatedDetailDbRow = { ...detailDbRow, quantity: 5 };
    const updatedSaleDbRow = { ...saleDbRow, totalAmount: "49.95" };

    // 1. Find existing detail
    mockTx.select.mockReturnValueOnce(makeTxSelectChain([detailDbRow]));
    // 2. Update detail (no returning needed — we re-fetch)
    mockTx.update.mockReturnValueOnce(makeTxUpdateReturningChain([updatedDetailDbRow]));
    // 3. Fetch all details after update
    mockTx.select.mockReturnValueOnce(makeTxSelectChain([updatedDetailDbRow]));
    // 4. Update sale totalAmount
    mockTx.update.mockReturnValueOnce(makeTxUpdateReturningChain([updatedSaleDbRow]));

    const service = createSaleService(transactionalDb);
    const result = await service.updateSaleDetail(SALE_ID, DETAIL_ID, { quantity: 5 });

    expect(result.totalAmount).toBe(49.95);
    expect(result.details).toHaveLength(1);
    expect(result.details[0]!.quantity).toBe(5);
    expect(mockCacheStore.invalidate).toHaveBeenCalledWith(`sales:${SALE_ID}`);
    expect(mockCacheStore.invalidate).toHaveBeenCalledWith("sales:list");
  });

  it("throws 404 when detail does not belong to the given sale", async () => {
    const mockTx = makeMockTx();
    const transactionalDb = {
      transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
    } as unknown as Parameters<typeof createSaleService>[0];

    // Detail not found
    mockTx.select.mockReturnValueOnce(makeTxSelectChain([]));

    const service = createSaleService(transactionalDb);
    await expect(
      service.updateSaleDetail(SALE_ID, "bad-detail-id", { quantity: 3 }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

// ── deleteSale ────────────────────────────────────────────────────────────────

describe("deleteSale", () => {
  function makeMockTx() {
    return {
      select: vi.fn(),
      update: vi.fn(),
    };
  }

  it("soft-deletes sale, reverts stock, and invalidates caches", async () => {
    const mockTx = makeMockTx();
    const transactionalDb = {
      transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
    } as unknown as Parameters<typeof createSaleService>[0];

    // 1. Select sale to verify exists
    mockTx.select.mockReturnValueOnce(makeTxSelectChain([saleDbRow]));
    // 2. Select details for stock revert
    mockTx.select.mockReturnValueOnce(makeTxSelectChain([detailDbRow]));
    // 3. Soft-delete sale
    mockTx.update.mockReturnValueOnce(makeTxUpdateChain());
    // 4. Revert product stock
    mockTx.update.mockReturnValueOnce(makeTxUpdateChain());

    const service = createSaleService(transactionalDb);
    await service.deleteSale(SALE_ID);

    expect(mockTx.update).toHaveBeenCalledTimes(2);
    expect(mockCacheStore.invalidate).toHaveBeenCalledWith(`sales:${SALE_ID}`);
    expect(mockCacheStore.invalidate).toHaveBeenCalledWith("sales:list");
  });

  it("throws 404 when sale does not exist", async () => {
    const mockTx = makeMockTx();
    const transactionalDb = {
      transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
    } as unknown as Parameters<typeof createSaleService>[0];

    // Sale not found
    mockTx.select.mockReturnValueOnce(makeTxSelectChain([]));

    const service = createSaleService(transactionalDb);
    await expect(service.deleteSale("bad-id")).rejects.toMatchObject({ status: 404 });
  });
});
