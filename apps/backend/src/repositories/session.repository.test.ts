import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "../db/client";
import { createSessionRepository } from "./session.repository";

// ── DB row fixture ────────────────────────────────────────────────────────────

const dbRow = {
  id: "00000000-0000-0000-0000-000000000001",
  userId: "00000000-0000-0000-0000-000000000002",
  tokenHash: "abc123deadbeef",
  expiresAt: new Date("2025-01-01T00:00:00.000Z"),
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

function makeDeleteChain() {
  return {
    where: vi.fn().mockResolvedValue(undefined),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

let mockSelect: ReturnType<typeof vi.fn>;
let mockInsert: ReturnType<typeof vi.fn>;
let mockDelete: ReturnType<typeof vi.fn>;
let db: Database;

beforeEach(() => {
  mockSelect = vi.fn();
  mockInsert = vi.fn();
  mockDelete = vi.fn();
  db = {
    select: mockSelect,
    insert: mockInsert,
    delete: mockDelete,
  } as unknown as Database;
});

describe("create", () => {
  it("inserts and returns the mapped session record", async () => {
    mockInsert.mockReturnValue(makeInsertChain([dbRow]));

    const repo = createSessionRepository(db);
    const result = await repo.create({
      userId: dbRow.userId,
      tokenHash: dbRow.tokenHash,
      expiresAt: dbRow.expiresAt,
    });

    expect(result.id).toBe(dbRow.id);
    expect(result.userId).toBe(dbRow.userId);
    expect(result.tokenHash).toBe(dbRow.tokenHash);
    expect(result.expiresAt).toBe("2025-01-01T00:00:00.000Z");
    expect(result.createdAt).toBe("2024-01-01T00:00:00.000Z");
  });
});

describe("findByTokenHash", () => {
  it("returns mapped record when token hash matches", async () => {
    mockSelect.mockReturnValue(makeSelectChain([dbRow]));

    const repo = createSessionRepository(db);
    const result = await repo.findByTokenHash(dbRow.tokenHash);

    expect(result).toBeDefined();
    expect(result!.id).toBe(dbRow.id);
    expect(result!.tokenHash).toBe(dbRow.tokenHash);
  });

  it("returns undefined when no session matches", async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));

    const repo = createSessionRepository(db);
    const result = await repo.findByTokenHash("nonexistent-hash");

    expect(result).toBeUndefined();
  });
});

describe("deleteByTokenHash", () => {
  it("calls delete with the token hash condition", async () => {
    const chain = makeDeleteChain();
    mockDelete.mockReturnValue(chain);

    const repo = createSessionRepository(db);
    await repo.deleteByTokenHash("somehash");

    expect(mockDelete).toHaveBeenCalledOnce();
    expect(chain.where).toHaveBeenCalledOnce();
  });
});

describe("deleteExpiredByUserId", () => {
  it("calls delete with userId and expiry condition", async () => {
    const chain = makeDeleteChain();
    mockDelete.mockReturnValue(chain);

    const repo = createSessionRepository(db);
    await repo.deleteExpiredByUserId(dbRow.userId);

    expect(mockDelete).toHaveBeenCalledOnce();
    expect(chain.where).toHaveBeenCalledOnce();
  });
});
