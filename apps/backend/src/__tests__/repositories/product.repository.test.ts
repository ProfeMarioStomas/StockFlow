import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "../../db/client";
import { createProductRepository } from "../../repositories/product.repository";

// ── DB row fixture ────────────────────────────────────────────────────────────

const dbRow = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Widget Pro",
  barcode: "7501234567890",
  price: "19.99",
  costPrice: "12.50",
  stock: 100,
  criticalStock: 10,
  imageKey: null,
  isActive: true,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: new Date("2024-01-01T00:00:00.000Z"),
};

// ── Drizzle query builder helpers ─────────────────────────────────────────────

function makeSelectChain(rows: (typeof dbRow)[]) {
  const fromResult = {
    where: vi.fn().mockResolvedValue(rows),
    then: (resolve: (v: unknown) => void, reject?: (r: unknown) => void) =>
      Promise.resolve(rows).then(resolve, reject),
    catch: (onRejected: (r: unknown) => void) => Promise.resolve(rows).catch(onRejected),
  };
  return { from: vi.fn().mockReturnValue(fromResult) };
}

function makeInsertChain(rows: (typeof dbRow)[]) {
  return {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(rows),
    }),
  };
}

function makeUpdateChain(rows: (typeof dbRow)[]) {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(rows),
      }),
    }),
  };
}

function makePaginatedSelectChain(rows: (typeof dbRow)[]) {
  const offsetFn = vi.fn().mockResolvedValue(rows);
  const limitChain = { limit: vi.fn().mockReturnValue({ offset: offsetFn }) };
  const orderByChain = { orderBy: vi.fn().mockReturnValue(limitChain) };
  const fromResult = {
    where: vi.fn().mockReturnValue(orderByChain),
    ...orderByChain,
  };
  return { from: vi.fn().mockReturnValue(fromResult) };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

let mockSelect: ReturnType<typeof vi.fn>;
let mockInsert: ReturnType<typeof vi.fn>;
let mockUpdate: ReturnType<typeof vi.fn>;
let db: Database;

beforeEach(() => {
  mockSelect = vi.fn();
  mockInsert = vi.fn();
  mockUpdate = vi.fn();
  db = { select: mockSelect, insert: mockInsert, update: mockUpdate } as unknown as Database;
});

describe("findAll", () => {
  it("returns all products mapped to domain records", async () => {
    mockSelect.mockReturnValue(makeSelectChain([dbRow]));

    const repo = createProductRepository(db);
    const result = await repo.findAll();

    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe(dbRow.id);
    expect(result[0]!.price).toBe(19.99);
    expect(result[0]!.createdAt).toBe("2024-01-01T00:00:00.000Z");
  });

  it("returns empty array when no products exist", async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));

    const repo = createProductRepository(db);
    const result = await repo.findAll();

    expect(result).toHaveLength(0);
  });

  it("applies isActive filter when provided", async () => {
    const activeChain = makeSelectChain([dbRow]);
    mockSelect.mockReturnValue(activeChain);

    const repo = createProductRepository(db);
    await repo.findAll({ isActive: true });

    expect(activeChain.from().where).toHaveBeenCalled();
  });

  it("returns only inactive products when isActive=false filter is applied", async () => {
    const inactiveRow = { ...dbRow, isActive: false };
    mockSelect.mockReturnValue(makeSelectChain([inactiveRow]));

    const repo = createProductRepository(db);
    const result = await repo.findAll({ isActive: false });

    expect(result).toHaveLength(1);
    expect(result[0]!.isActive).toBe(false);
  });
});

describe("findById", () => {
  it("returns mapped record when product exists", async () => {
    mockSelect.mockReturnValue(makeSelectChain([dbRow]));

    const repo = createProductRepository(db);
    const result = await repo.findById(dbRow.id);

    expect(result).toBeDefined();
    expect(result!.id).toBe(dbRow.id);
    expect(result!.price).toBe(19.99);
  });

  it("returns undefined when product does not exist", async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));

    const repo = createProductRepository(db);
    const result = await repo.findById("non-existent");

    expect(result).toBeUndefined();
  });
});

describe("create", () => {
  it("inserts and returns the created record with price as number", async () => {
    mockInsert.mockReturnValue(makeInsertChain([dbRow]));

    const repo = createProductRepository(db);
    const result = await repo.create({
      name: "Widget Pro",
      barcode: "7501234567890",
      price: 19.99,
      stock: 100,
    });

    expect(result.id).toBe(dbRow.id);
    expect(result.barcode).toBe("7501234567890");
    expect(result.price).toBe(19.99);
    expect(result.costPrice).toBe(12.5);
    expect(result.stock).toBe(100);
    expect(result.criticalStock).toBe(10);
    expect(result.imageKey).toBeNull();
  });

  it("uses default stock when stock is not provided", async () => {
    const rowWithDefaultStock = { ...dbRow, stock: 0 };
    mockInsert.mockReturnValue(makeInsertChain([rowWithDefaultStock]));

    const repo = createProductRepository(db);
    const result = await repo.create({
      name: "Widget Pro",
      barcode: "7501234567890",
      price: 19.99,
    });

    expect(result.stock).toBe(0);
  });
});

describe("update", () => {
  it("updates and returns the modified record", async () => {
    const updatedRow = { ...dbRow, name: "Updated Widget" };
    mockUpdate.mockReturnValue(makeUpdateChain([updatedRow]));

    const repo = createProductRepository(db);
    const result = await repo.update(dbRow.id, { name: "Updated Widget" });

    expect(result).toBeDefined();
    expect(result!.name).toBe("Updated Widget");
  });

  it("returns undefined when no row was matched", async () => {
    mockUpdate.mockReturnValue(makeUpdateChain([]));

    const repo = createProductRepository(db);
    const result = await repo.update("bad-id", { name: "X" });

    expect(result).toBeUndefined();
  });
});

describe("softDelete", () => {
  it("sets isActive to false and returns the updated record", async () => {
    const deletedRow = { ...dbRow, isActive: false };
    mockUpdate.mockReturnValue(makeUpdateChain([deletedRow]));

    const repo = createProductRepository(db);
    const result = await repo.softDelete(dbRow.id);

    expect(result).toBeDefined();
    expect(result!.isActive).toBe(false);
  });
});

describe("count", () => {
  it("returns total count of all products", async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ total: 5 }] as never[]));

    const repo = createProductRepository(db);
    const result = await repo.count();

    expect(result).toBe(5);
  });

  it("returns filtered count when isActive filter is provided", async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ total: 3 }] as never[]));

    const repo = createProductRepository(db);
    const result = await repo.count({ isActive: true });

    expect(result).toBe(3);
  });
});

describe("findPage", () => {
  it("returns paginated records without filter", async () => {
    mockSelect.mockReturnValue(makePaginatedSelectChain([dbRow]));

    const repo = createProductRepository(db);
    const result = await repo.findPage(undefined, { limit: 20, offset: 0 });

    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe(dbRow.id);
    expect(result[0]!.price).toBe(19.99);
  });

  it("applies isActive filter when provided", async () => {
    mockSelect.mockReturnValue(makePaginatedSelectChain([dbRow]));

    const repo = createProductRepository(db);
    const result = await repo.findPage({ isActive: true }, { limit: 10, offset: 0 });

    expect(result).toHaveLength(1);
  });

  it("returns empty array when no records match", async () => {
    mockSelect.mockReturnValue(makePaginatedSelectChain([]));

    const repo = createProductRepository(db);
    const result = await repo.findPage(undefined, { limit: 20, offset: 0 });

    expect(result).toHaveLength(0);
  });
});
