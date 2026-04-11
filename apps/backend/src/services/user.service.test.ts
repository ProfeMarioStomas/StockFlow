import { HTTPException } from "hono/http-exception";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Hoisted mocks (available before module imports) ───────────────────────────

const { mockRepo, mockCacheStore } = vi.hoisted(() => ({
  mockRepo: {
    findAll: vi.fn(),
    findById: vi.fn(),
    findByEmail: vi.fn(),
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

vi.mock("../repositories/user.repository", () => ({
  createUserRepository: () => mockRepo,
}));

vi.mock("../lib/cache", () => ({
  cache: mockCacheStore,
}));

vi.mock("../lib/password", () => ({
  hashPassword: vi.fn().mockResolvedValue("salt:hash"),
  verifyPassword: vi.fn().mockResolvedValue(false),
}));

// ── Module under test (imported AFTER mocks) ──────────────────────────────────

import { verifyPassword } from "../lib/password";
import { createUserService } from "./user.service";

// ── Test helpers ──────────────────────────────────────────────────────────────

const mockDb = {} as Parameters<typeof createUserService>[0];

const sampleRecord = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Test User",
  email: "test@example.com",
  role: "admin" as const,
  isActive: true,
  passwordHash: "salt:hash",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── listUsers ─────────────────────────────────────────────────────────────────

describe("listUsers", () => {
  it("returns cached value on cache hit without hitting the DB", async () => {
    const cached = [{ ...sampleRecord }];
    mockCacheStore.get.mockReturnValue(cached);

    const service = createUserService(mockDb);
    const result = await service.listUsers();

    expect(result).toBe(cached);
    expect(mockRepo.findAll).not.toHaveBeenCalled();
  });

  it("fetches from DB, strips passwordHash, and caches on miss", async () => {
    mockCacheStore.get.mockReturnValue(undefined);
    mockRepo.findAll.mockResolvedValue([sampleRecord]);

    const service = createUserService(mockDb);
    const result = await service.listUsers();

    expect(mockRepo.findAll).toHaveBeenCalledOnce();
    expect(mockCacheStore.set).toHaveBeenCalledWith(
      "users:list",
      expect.any(Array),
      expect.any(Number),
    );
    expect(result).toHaveLength(1);
    expect(result[0]).not.toHaveProperty("passwordHash");
  });
});

// ── getUserById ───────────────────────────────────────────────────────────────

describe("getUserById", () => {
  it("returns cached user on cache hit", async () => {
    const cached = { ...sampleRecord };
    mockCacheStore.get.mockReturnValue(cached);

    const service = createUserService(mockDb);
    const result = await service.getUserById(sampleRecord.id);

    expect(result).toBe(cached);
    expect(mockRepo.findById).not.toHaveBeenCalled();
  });

  it("fetches from DB and caches when not in cache", async () => {
    mockCacheStore.get.mockReturnValue(undefined);
    mockRepo.findById.mockResolvedValue(sampleRecord);

    const service = createUserService(mockDb);
    const result = await service.getUserById(sampleRecord.id);

    expect(mockRepo.findById).toHaveBeenCalledWith(sampleRecord.id);
    expect(mockCacheStore.set).toHaveBeenCalledWith(
      `users:${sampleRecord.id}`,
      expect.any(Object),
      expect.any(Number),
    );
    expect(result).not.toHaveProperty("passwordHash");
  });

  it("throws 404 when user does not exist", async () => {
    mockCacheStore.get.mockReturnValue(undefined);
    mockRepo.findById.mockResolvedValue(undefined);

    const service = createUserService(mockDb);
    await expect(service.getUserById("non-existent-id")).rejects.toThrow(HTTPException);
    await expect(service.getUserById("non-existent-id")).rejects.toMatchObject({ status: 404 });
  });
});

// ── createUser ────────────────────────────────────────────────────────────────

describe("createUser", () => {
  it("creates user, invalidates list cache, and returns without passwordHash", async () => {
    mockRepo.findByEmail.mockResolvedValue(undefined);
    mockRepo.create.mockResolvedValue(sampleRecord);

    const service = createUserService(mockDb);
    const result = await service.createUser({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      role: "admin",
    });

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ passwordHash: "salt:hash" }),
    );
    expect(mockCacheStore.invalidate).toHaveBeenCalledWith("users:list");
    expect(result).not.toHaveProperty("passwordHash");
  });

  it("throws 409 when email is already taken", async () => {
    mockRepo.findByEmail.mockResolvedValue(sampleRecord);

    const service = createUserService(mockDb);
    await expect(
      service.createUser({
        name: "New",
        email: "test@example.com",
        password: "password123",
        role: "admin",
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
});

// ── updateUser ────────────────────────────────────────────────────────────────

describe("updateUser", () => {
  it("updates user, invalidates caches, and returns updated data", async () => {
    const updated = { ...sampleRecord, name: "Updated Name" };
    mockRepo.findById.mockResolvedValue(sampleRecord);
    mockRepo.update.mockResolvedValue(updated);

    const service = createUserService(mockDb);
    const result = await service.updateUser(sampleRecord.id, { name: "Updated Name" });

    expect(mockRepo.update).toHaveBeenCalledWith(sampleRecord.id, { name: "Updated Name" });
    expect(mockCacheStore.invalidate).toHaveBeenCalledWith(`users:${sampleRecord.id}`);
    expect(mockCacheStore.invalidate).toHaveBeenCalledWith("users:list");
    expect(result.name).toBe("Updated Name");
  });

  it("throws 404 when user does not exist", async () => {
    mockRepo.findById.mockResolvedValue(undefined);

    const service = createUserService(mockDb);
    await expect(service.updateUser("bad-id", { name: "X" })).rejects.toMatchObject({
      status: 404,
    });
  });

  it("throws 409 when the new email belongs to another user", async () => {
    const otherUser = { ...sampleRecord, id: "other-id", email: "other@example.com" };
    mockRepo.findById.mockResolvedValue(sampleRecord);
    mockRepo.findByEmail.mockResolvedValue(otherUser);

    const service = createUserService(mockDb);
    await expect(
      service.updateUser(sampleRecord.id, { email: "other@example.com" }),
    ).rejects.toMatchObject({ status: 409 });
  });
});

// ── changePassword ────────────────────────────────────────────────────────────

describe("changePassword", () => {
  it("changes password when current password is correct", async () => {
    mockRepo.findById.mockResolvedValue(sampleRecord);
    vi.mocked(verifyPassword).mockResolvedValue(true);

    const service = createUserService(mockDb);
    await service.changePassword(sampleRecord.id, {
      currentPassword: "correct",
      newPassword: "newpassword123",
    });

    expect(mockRepo.update).toHaveBeenCalledWith(sampleRecord.id, { passwordHash: "salt:hash" });
  });

  it("throws 404 when user does not exist", async () => {
    mockRepo.findById.mockResolvedValue(undefined);

    const service = createUserService(mockDb);
    await expect(
      service.changePassword("bad-id", { currentPassword: "x", newPassword: "y" }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("throws 422 when current password is incorrect", async () => {
    mockRepo.findById.mockResolvedValue(sampleRecord);
    vi.mocked(verifyPassword).mockResolvedValue(false);

    const service = createUserService(mockDb);
    await expect(
      service.changePassword(sampleRecord.id, {
        currentPassword: "wrong",
        newPassword: "new123456",
      }),
    ).rejects.toMatchObject({ status: 422 });
  });
});

// ── deleteUser ────────────────────────────────────────────────────────────────

describe("deleteUser", () => {
  it("soft-deletes user and invalidates caches", async () => {
    mockRepo.findById.mockResolvedValue(sampleRecord);
    mockRepo.softDelete.mockResolvedValue({ ...sampleRecord, isActive: false });

    const service = createUserService(mockDb);
    await service.deleteUser(sampleRecord.id);

    expect(mockRepo.softDelete).toHaveBeenCalledWith(sampleRecord.id);
    expect(mockCacheStore.invalidate).toHaveBeenCalledWith(`users:${sampleRecord.id}`);
    expect(mockCacheStore.invalidate).toHaveBeenCalledWith("users:list");
  });

  it("throws 404 when user does not exist", async () => {
    mockRepo.findById.mockResolvedValue(undefined);

    const service = createUserService(mockDb);
    await expect(service.deleteUser("bad-id")).rejects.toMatchObject({ status: 404 });
  });
});
