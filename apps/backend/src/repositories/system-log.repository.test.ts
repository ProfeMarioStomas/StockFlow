import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "../db/client";
import { createSystemLogRepository } from "./system-log.repository";

// ── DB row fixture ────────────────────────────────────────────────────────────

const logRow = {
  id: "00000000-0000-0000-0000-000000000001",
  userId: "00000000-0000-0000-0000-000000000099",
  note: "POST /api/v1/sales → 201",
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: new Date("2024-01-01T00:00:00.000Z"),
};

// ── Drizzle query builder helpers ─────────────────────────────────────────────

function makeSelectChain(rows: unknown[]) {
  const base = {
    where: vi.fn().mockReturnValue({
      orderBy: vi.fn().mockResolvedValue(rows),
    }),
    orderBy: vi.fn().mockResolvedValue(rows),
  };
  return { from: vi.fn().mockReturnValue(base) };
}

function makeInsertChain(rows: unknown[]) {
  return {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(rows),
    }),
  };
}

function makeCountChain(total: number) {
  const fromResult = {
    where: vi.fn().mockResolvedValue([{ total }]),
    then: (resolve: (v: unknown) => void, reject?: (r: unknown) => void) =>
      Promise.resolve([{ total }]).then(resolve, reject),
    catch: (onRejected: (r: unknown) => void) => Promise.resolve([{ total }]).catch(onRejected),
  };
  return { from: vi.fn().mockReturnValue(fromResult) };
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
let mockInsert: ReturnType<typeof vi.fn>;
let db: Database;

beforeEach(() => {
  mockSelect = vi.fn();
  mockInsert = vi.fn();
  db = { select: mockSelect, insert: mockInsert } as unknown as Database;
});

// ── findAll ───────────────────────────────────────────────────────────────────

describe("findAll", () => {
  it("returns all logs ordered by createdAt desc", async () => {
    mockSelect.mockReturnValue(makeSelectChain([logRow]));

    const repo = createSystemLogRepository(db);
    const result = await repo.findAll();

    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe(logRow.id);
    expect(result[0]!.note).toBe("POST /api/v1/sales → 201");
    expect(result[0]!.createdAt).toBe("2024-01-01T00:00:00.000Z");
  });

  it("returns empty array when no logs exist", async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));

    const repo = createSystemLogRepository(db);
    const result = await repo.findAll();

    expect(result).toHaveLength(0);
  });

  it("applies userId filter when provided", async () => {
    const chain = makeSelectChain([logRow]);
    mockSelect.mockReturnValue(chain);

    const repo = createSystemLogRepository(db);
    await repo.findAll({ userId: logRow.userId });

    expect(chain.from().where).toHaveBeenCalled();
  });

  it("returns only logs for the given userId when filter is applied", async () => {
    const otherLog = {
      ...logRow,
      id: "00000000-0000-0000-0000-000000000002",
      userId: logRow.userId,
    };
    mockSelect.mockReturnValue(makeSelectChain([logRow, otherLog]));

    const repo = createSystemLogRepository(db);
    const result = await repo.findAll({ userId: logRow.userId });

    expect(result).toHaveLength(2);
    expect(result.every((r) => r.userId === logRow.userId)).toBe(true);
  });
});

// ── create ────────────────────────────────────────────────────────────────────

describe("create", () => {
  it("inserts a log and returns the mapped record", async () => {
    mockInsert.mockReturnValue(makeInsertChain([logRow]));

    const repo = createSystemLogRepository(db);
    const result = await repo.create({ userId: logRow.userId, note: logRow.note });

    expect(result.id).toBe(logRow.id);
    expect(result.userId).toBe(logRow.userId);
    expect(result.note).toBe("POST /api/v1/sales → 201");
    expect(result.createdAt).toBe("2024-01-01T00:00:00.000Z");
  });
});

// ── count ─────────────────────────────────────────────────────────────────────

describe("count", () => {
  it("returns total count of all logs", async () => {
    mockSelect.mockReturnValue(makeCountChain(10));

    const repo = createSystemLogRepository(db);
    const result = await repo.count();

    expect(result).toBe(10);
  });

  it("returns filtered count when userId filter is provided", async () => {
    mockSelect.mockReturnValue(makeCountChain(3));

    const repo = createSystemLogRepository(db);
    const result = await repo.count({ userId: logRow.userId });

    expect(result).toBe(3);
  });
});

// ── findPage ──────────────────────────────────────────────────────────────────

describe("findPage", () => {
  it("returns paginated log records without filter", async () => {
    mockSelect.mockReturnValue(makePaginatedSelectChain([logRow]));

    const repo = createSystemLogRepository(db);
    const result = await repo.findPage(undefined, { limit: 20, offset: 0 });

    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe(logRow.id);
    expect(result[0]!.note).toBe("POST /api/v1/sales → 201");
  });

  it("applies userId filter when provided", async () => {
    mockSelect.mockReturnValue(makePaginatedSelectChain([logRow]));

    const repo = createSystemLogRepository(db);
    const result = await repo.findPage({ userId: logRow.userId }, { limit: 10, offset: 0 });

    expect(result).toHaveLength(1);
  });

  it("returns empty array when no records match", async () => {
    mockSelect.mockReturnValue(makePaginatedSelectChain([]));

    const repo = createSystemLogRepository(db);
    const result = await repo.findPage(undefined, { limit: 20, offset: 0 });

    expect(result).toHaveLength(0);
  });
});
