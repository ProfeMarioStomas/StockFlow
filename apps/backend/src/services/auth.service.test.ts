import { HTTPException } from "hono/http-exception";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Hoisted mocks (available before module imports) ───────────────────────────

const { mockUserRepo, mockSessionRepo } = vi.hoisted(() => ({
  mockUserRepo: {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
  },
  mockSessionRepo: {
    create: vi.fn(),
    findByTokenHash: vi.fn(),
    deleteByTokenHash: vi.fn(),
    deleteExpiredByUserId: vi.fn(),
  },
}));

vi.mock("../repositories/user.repository", () => ({
  createUserRepository: () => mockUserRepo,
}));

vi.mock("../repositories/session.repository", () => ({
  createSessionRepository: () => mockSessionRepo,
}));

vi.mock("../lib/password", () => ({
  verifyPassword: vi.fn(),
}));

vi.mock("../lib/token", () => ({
  generateOpaqueToken: vi.fn().mockReturnValue("raw-refresh-token"),
  hashToken: vi.fn().mockResolvedValue("hashed-token"),
  signJwt: vi.fn().mockResolvedValue("signed.jwt.token"),
}));

// ── Module under test (imported AFTER mocks) ──────────────────────────────────

import { verifyPassword } from "../lib/password";
import { createAuthService } from "./auth.service";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockDb = {} as Parameters<typeof createAuthService>[0];

const activeUser = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Test User",
  email: "test@example.com",
  role: "admin" as const,
  isActive: true,
  passwordHash: "salt:hash",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const activeSession = {
  id: "00000000-0000-0000-0000-000000000010",
  userId: activeUser.id,
  tokenHash: "hashed-token",
  expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(), // 7 days from now
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSessionRepo.deleteExpiredByUserId.mockResolvedValue(undefined);
  mockSessionRepo.create.mockResolvedValue(activeSession);
  mockSessionRepo.deleteByTokenHash.mockResolvedValue(undefined);
});

// ── login ─────────────────────────────────────────────────────────────────────

describe("login", () => {
  it("returns accessToken, refreshToken, and user on valid credentials", async () => {
    mockUserRepo.findByEmail.mockResolvedValue(activeUser);
    vi.mocked(verifyPassword).mockResolvedValue(true);

    const service = createAuthService(mockDb);
    const result = await service.login("test@example.com", "password123", "jwt-secret");

    expect(result.accessToken).toBe("signed.jwt.token");
    expect(result.refreshToken).toBe("raw-refresh-token");
    expect(result.user).toMatchObject({
      id: activeUser.id,
      name: activeUser.name,
      email: activeUser.email,
      role: activeUser.role,
    });
  });

  it("calls deleteExpiredByUserId before creating session", async () => {
    mockUserRepo.findByEmail.mockResolvedValue(activeUser);
    vi.mocked(verifyPassword).mockResolvedValue(true);

    const service = createAuthService(mockDb);
    await service.login("test@example.com", "password123", "jwt-secret");

    expect(mockSessionRepo.deleteExpiredByUserId).toHaveBeenCalledWith(activeUser.id);
    expect(mockSessionRepo.create).toHaveBeenCalledOnce();
  });

  it("throws 401 INVALID_CREDENTIALS when email not found", async () => {
    mockUserRepo.findByEmail.mockResolvedValue(undefined);

    const service = createAuthService(mockDb);
    const err = await service.login("bad@example.com", "pw", "secret").catch((e) => e);

    expect(err).toBeInstanceOf(HTTPException);
    expect(err.status).toBe(401);
    expect(err.code).toBe("INVALID_CREDENTIALS");
  });

  it("throws 401 INVALID_CREDENTIALS when password is wrong", async () => {
    mockUserRepo.findByEmail.mockResolvedValue(activeUser);
    vi.mocked(verifyPassword).mockResolvedValue(false);

    const service = createAuthService(mockDb);
    const err = await service.login("test@example.com", "wrong", "secret").catch((e) => e);

    expect(err).toBeInstanceOf(HTTPException);
    expect(err.status).toBe(401);
    expect(err.code).toBe("INVALID_CREDENTIALS");
  });

  it("throws 401 ACCOUNT_DISABLED for inactive user", async () => {
    mockUserRepo.findByEmail.mockResolvedValue({ ...activeUser, isActive: false });
    vi.mocked(verifyPassword).mockResolvedValue(true);

    const service = createAuthService(mockDb);
    const err = await service.login("test@example.com", "pw", "secret").catch((e) => e);

    expect(err).toBeInstanceOf(HTTPException);
    expect(err.status).toBe(401);
    expect(err.code).toBe("ACCOUNT_DISABLED");
  });
});

// ── refresh ───────────────────────────────────────────────────────────────────

describe("refresh", () => {
  it("returns new accessToken and user for valid refresh token", async () => {
    mockSessionRepo.findByTokenHash.mockResolvedValue(activeSession);
    mockUserRepo.findById.mockResolvedValue(activeUser);

    const service = createAuthService(mockDb);
    const result = await service.refresh("raw-refresh-token", "jwt-secret");

    expect(result.accessToken).toBe("signed.jwt.token");
    expect(result.user.id).toBe(activeUser.id);
  });

  it("throws 401 INVALID_TOKEN when session not found", async () => {
    mockSessionRepo.findByTokenHash.mockResolvedValue(undefined);

    const service = createAuthService(mockDb);
    const err = await service.refresh("bad-token", "secret").catch((e) => e);

    expect(err.status).toBe(401);
    expect(err.code).toBe("INVALID_TOKEN");
  });

  it("throws 401 TOKEN_EXPIRED when session is expired", async () => {
    const expiredSession = {
      ...activeSession,
      expiresAt: new Date(Date.now() - 1000).toISOString(), // 1 second ago
    };
    mockSessionRepo.findByTokenHash.mockResolvedValue(expiredSession);

    const service = createAuthService(mockDb);
    const err = await service.refresh("raw-refresh-token", "secret").catch((e) => e);

    expect(err.status).toBe(401);
    expect(err.code).toBe("TOKEN_EXPIRED");
  });

  it("throws 401 INVALID_TOKEN when user no longer exists", async () => {
    mockSessionRepo.findByTokenHash.mockResolvedValue(activeSession);
    mockUserRepo.findById.mockResolvedValue(undefined);

    const service = createAuthService(mockDb);
    const err = await service.refresh("raw-refresh-token", "secret").catch((e) => e);

    expect(err.status).toBe(401);
    expect(err.code).toBe("INVALID_TOKEN");
  });

  it("throws 401 ACCOUNT_DISABLED when user is inactive", async () => {
    mockSessionRepo.findByTokenHash.mockResolvedValue(activeSession);
    mockUserRepo.findById.mockResolvedValue({ ...activeUser, isActive: false });

    const service = createAuthService(mockDb);
    const err = await service.refresh("raw-refresh-token", "secret").catch((e) => e);

    expect(err.status).toBe(401);
    expect(err.code).toBe("ACCOUNT_DISABLED");
  });
});

// ── logout ────────────────────────────────────────────────────────────────────

describe("logout", () => {
  it("deletes the session by token hash", async () => {
    const service = createAuthService(mockDb);
    await service.logout("raw-refresh-token");

    expect(mockSessionRepo.deleteByTokenHash).toHaveBeenCalledWith("hashed-token");
  });

  it("resolves silently even if session does not exist", async () => {
    mockSessionRepo.deleteByTokenHash.mockResolvedValue(undefined);

    const service = createAuthService(mockDb);
    await expect(service.logout("nonexistent-token")).resolves.toBeUndefined();
  });
});
