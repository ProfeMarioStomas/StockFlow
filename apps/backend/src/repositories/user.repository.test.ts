import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "../db/client";
import { createUserRepository } from "./user.repository";

// ── DB row fixture ────────────────────────────────────────────────────────────

const dbRow = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Test User",
  email: "test@example.com",
  passwordHash: "salt:hash",
  role: "admin" as const,
  isActive: true,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: new Date("2024-01-01T00:00:00.000Z"),
};

// ── Drizzle query builder helpers ─────────────────────────────────────────────
// Each helper returns a mock chain that resolves to the provided rows.

function makeSelectChain(rows: (typeof dbRow)[]) {
  // .from() returns a thenable (for findAll) that also has .where() (for findById/findByEmail)
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
  it("returns all users mapped to domain records", async () => {
    mockSelect.mockReturnValue(makeSelectChain([dbRow]));

    const repo = createUserRepository(db);
    const result = await repo.findAll();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(dbRow.id);
    expect(result[0].createdAt).toBe("2024-01-01T00:00:00.000Z");
    expect(result[0]).toHaveProperty("passwordHash");
  });

  it("returns empty array when no users exist", async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));

    const repo = createUserRepository(db);
    const result = await repo.findAll();

    expect(result).toHaveLength(0);
  });
});

describe("findById", () => {
  it("returns mapped record when user exists", async () => {
    mockSelect.mockReturnValue(makeSelectChain([dbRow]));

    const repo = createUserRepository(db);
    const result = await repo.findById(dbRow.id);

    expect(result).toBeDefined();
    expect(result!.id).toBe(dbRow.id);
    expect(result!.email).toBe(dbRow.email);
  });

  it("returns undefined when user does not exist", async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));

    const repo = createUserRepository(db);
    const result = await repo.findById("non-existent");

    expect(result).toBeUndefined();
  });
});

describe("findByEmail", () => {
  it("returns mapped record when email exists", async () => {
    mockSelect.mockReturnValue(makeSelectChain([dbRow]));

    const repo = createUserRepository(db);
    const result = await repo.findByEmail(dbRow.email);

    expect(result).toBeDefined();
    expect(result!.email).toBe(dbRow.email);
  });

  it("returns undefined when email does not exist", async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));

    const repo = createUserRepository(db);
    const result = await repo.findByEmail("missing@example.com");

    expect(result).toBeUndefined();
  });
});

describe("create", () => {
  it("inserts and returns the created record", async () => {
    mockInsert.mockReturnValue(makeInsertChain([dbRow]));

    const repo = createUserRepository(db);
    const result = await repo.create({
      name: dbRow.name,
      email: dbRow.email,
      passwordHash: dbRow.passwordHash,
      role: dbRow.role,
    });

    expect(result.id).toBe(dbRow.id);
    expect(result.passwordHash).toBe(dbRow.passwordHash);
  });
});

describe("update", () => {
  it("updates and returns the modified record", async () => {
    const updatedRow = { ...dbRow, name: "Updated" };
    mockUpdate.mockReturnValue(makeUpdateChain([updatedRow]));

    const repo = createUserRepository(db);
    const result = await repo.update(dbRow.id, { name: "Updated" });

    expect(result).toBeDefined();
    expect(result!.name).toBe("Updated");
  });

  it("returns undefined when no row was matched", async () => {
    mockUpdate.mockReturnValue(makeUpdateChain([]));

    const repo = createUserRepository(db);
    const result = await repo.update("bad-id", { name: "X" });

    expect(result).toBeUndefined();
  });
});

describe("softDelete", () => {
  it("sets isActive to false and returns the updated record", async () => {
    const deletedRow = { ...dbRow, isActive: false };
    mockUpdate.mockReturnValue(makeUpdateChain([deletedRow]));

    const repo = createUserRepository(db);
    const result = await repo.softDelete(dbRow.id);

    expect(result).toBeDefined();
    expect(result!.isActive).toBe(false);
  });
});
