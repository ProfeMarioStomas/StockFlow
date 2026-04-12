import { HTTPException } from "hono/http-exception";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Hoisted mocks (available before module imports) ───────────────────────────

const { mockRepo, mockCacheStore } = vi.hoisted(() => ({
  mockRepo: {
    findAll: vi.fn(),
    findById: vi.fn(),
    findPage: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
  },
  mockCacheStore: {
    get: vi.fn(),
    set: vi.fn(),
    invalidate: vi.fn(),
    invalidatePrefix: vi.fn(),
  },
}));

vi.mock("../repositories/product.repository", () => ({
  createProductRepository: () => mockRepo,
}));

vi.mock("../lib/cache", () => ({
  cache: mockCacheStore,
}));

// ── Module under test (imported AFTER mocks) ──────────────────────────────────

import { createProductService } from "./product.service";

// ── Test helpers ──────────────────────────────────────────────────────────────

const mockDb = {} as Parameters<typeof createProductService>[0];

const sampleRecord = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Widget Pro",
  price: 19.99,
  stock: 100,
  isActive: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── listProducts ──────────────────────────────────────────────────────────────

describe("listProducts", () => {
  it("returns paginated response with data and meta", async () => {
    mockRepo.findPage.mockResolvedValue([sampleRecord]);
    mockRepo.count.mockResolvedValue(1);

    const service = createProductService(mockDb);
    const result = await service.listProducts();

    expect(mockRepo.findPage).toHaveBeenCalledOnce();
    expect(mockRepo.count).toHaveBeenCalledOnce();
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(result.meta.page).toBe(1);
    expect(result.meta.pageSize).toBe(20);
    expect(result.meta.totalPages).toBe(1);
  });

  it("passes isActive filter to findPage and count", async () => {
    mockRepo.findPage.mockResolvedValue([sampleRecord]);
    mockRepo.count.mockResolvedValue(1);

    const service = createProductService(mockDb);
    await service.listProducts({ isActive: true });

    expect(mockRepo.findPage).toHaveBeenCalledWith({ isActive: true }, expect.any(Object));
    expect(mockRepo.count).toHaveBeenCalledWith({ isActive: true });
  });

  it("calculates totalPages correctly for multiple pages", async () => {
    mockRepo.findPage.mockResolvedValue([sampleRecord]);
    mockRepo.count.mockResolvedValue(45);

    const service = createProductService(mockDb);
    const result = await service.listProducts(undefined, 2, 20);

    expect(result.meta.total).toBe(45);
    expect(result.meta.page).toBe(2);
    expect(result.meta.totalPages).toBe(3);
  });
});

// ── listAllProducts ───────────────────────────────────────────────────────────

describe("listAllProducts", () => {
  it("returns cached value on cache hit without hitting the DB", async () => {
    const cached = [sampleRecord];
    mockCacheStore.get.mockReturnValue(cached);

    const service = createProductService(mockDb);
    const result = await service.listAllProducts();

    expect(result).toBe(cached);
    expect(mockRepo.findAll).not.toHaveBeenCalled();
  });

  it("fetches from DB and caches on miss", async () => {
    mockCacheStore.get.mockReturnValue(undefined);
    mockRepo.findAll.mockResolvedValue([sampleRecord]);

    const service = createProductService(mockDb);
    const result = await service.listAllProducts();

    expect(mockRepo.findAll).toHaveBeenCalledOnce();
    expect(mockCacheStore.set).toHaveBeenCalledWith(
      "products:list",
      expect.any(Array),
      expect.any(Number),
    );
    expect(result).toHaveLength(1);
  });

  it("passes isActive filter to findAll", async () => {
    mockCacheStore.get.mockReturnValue(undefined);
    mockRepo.findAll.mockResolvedValue([sampleRecord]);

    const service = createProductService(mockDb);
    await service.listAllProducts({ isActive: true });

    expect(mockRepo.findAll).toHaveBeenCalledWith({ isActive: true });
  });
});

// ── getProductById ────────────────────────────────────────────────────────────

describe("getProductById", () => {
  it("returns cached product on cache hit", async () => {
    const cached = { ...sampleRecord };
    mockCacheStore.get.mockReturnValue(cached);

    const service = createProductService(mockDb);
    const result = await service.getProductById(sampleRecord.id);

    expect(result).toBe(cached);
    expect(mockRepo.findById).not.toHaveBeenCalled();
  });

  it("fetches from DB and caches when not in cache", async () => {
    mockCacheStore.get.mockReturnValue(undefined);
    mockRepo.findById.mockResolvedValue(sampleRecord);

    const service = createProductService(mockDb);
    const result = await service.getProductById(sampleRecord.id);

    expect(mockRepo.findById).toHaveBeenCalledWith(sampleRecord.id);
    expect(mockCacheStore.set).toHaveBeenCalledWith(
      `products:${sampleRecord.id}`,
      expect.any(Object),
      expect.any(Number),
    );
    expect(result.price).toBe(19.99);
  });

  it("throws 404 when product does not exist", async () => {
    mockCacheStore.get.mockReturnValue(undefined);
    mockRepo.findById.mockResolvedValue(undefined);

    const service = createProductService(mockDb);
    await expect(service.getProductById("non-existent-id")).rejects.toThrow(HTTPException);
    await expect(service.getProductById("non-existent-id")).rejects.toMatchObject({ status: 404 });
  });
});

// ── createProduct ─────────────────────────────────────────────────────────────

describe("createProduct", () => {
  it("creates product, invalidates list cache, and returns the record", async () => {
    mockRepo.create.mockResolvedValue(sampleRecord);

    const service = createProductService(mockDb);
    const result = await service.createProduct({
      name: "Widget Pro",
      price: 19.99,
      stock: 100,
    });

    expect(mockRepo.create).toHaveBeenCalledWith({ name: "Widget Pro", price: 19.99, stock: 100 });
    expect(mockCacheStore.invalidate).toHaveBeenCalledWith("products:list");
    expect(result.price).toBe(19.99);
    expect(result.stock).toBe(100);
  });

  it("creates product without stock (uses default)", async () => {
    const recordWithDefaultStock = { ...sampleRecord, stock: 0 };
    mockRepo.create.mockResolvedValue(recordWithDefaultStock);

    const service = createProductService(mockDb);
    const result = await service.createProduct({ name: "Widget Pro", price: 19.99 });

    expect(mockRepo.create).toHaveBeenCalledWith({
      name: "Widget Pro",
      price: 19.99,
      stock: undefined,
    });
    expect(result.stock).toBe(0);
  });
});

// ── updateProduct ─────────────────────────────────────────────────────────────

describe("updateProduct", () => {
  it("updates product, invalidates caches, and returns updated data", async () => {
    const updated = { ...sampleRecord, price: 24.99 };
    mockRepo.findById.mockResolvedValue(sampleRecord);
    mockRepo.update.mockResolvedValue(updated);

    const service = createProductService(mockDb);
    const result = await service.updateProduct(sampleRecord.id, { price: 24.99 });

    expect(mockRepo.update).toHaveBeenCalledWith(sampleRecord.id, { price: 24.99 });
    expect(mockCacheStore.invalidate).toHaveBeenCalledWith(`products:${sampleRecord.id}`);
    expect(mockCacheStore.invalidate).toHaveBeenCalledWith("products:list");
    expect(result.price).toBe(24.99);
    expect(result.stock).toBe(100);
  });

  it("throws 404 when product does not exist", async () => {
    mockRepo.findById.mockResolvedValue(undefined);

    const service = createProductService(mockDb);
    await expect(service.updateProduct("bad-id", { price: 9.99 })).rejects.toMatchObject({
      status: 404,
    });
  });
});

// ── deleteProduct ─────────────────────────────────────────────────────────────

describe("deleteProduct", () => {
  it("soft-deletes product and invalidates caches", async () => {
    mockRepo.findById.mockResolvedValue(sampleRecord);
    mockRepo.softDelete.mockResolvedValue({ ...sampleRecord, isActive: false });

    const service = createProductService(mockDb);
    await service.deleteProduct(sampleRecord.id);

    expect(mockRepo.softDelete).toHaveBeenCalledWith(sampleRecord.id);
    expect(mockCacheStore.invalidate).toHaveBeenCalledWith(`products:${sampleRecord.id}`);
    expect(mockCacheStore.invalidate).toHaveBeenCalledWith("products:list");
  });

  it("throws 404 when product does not exist", async () => {
    mockRepo.findById.mockResolvedValue(undefined);

    const service = createProductService(mockDb);
    await expect(service.deleteProduct("bad-id")).rejects.toMatchObject({ status: 404 });
  });
});
