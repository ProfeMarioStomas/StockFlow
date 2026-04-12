import { HTTPException } from "hono/http-exception";
import type { Database } from "../db/client";
import { verifyPassword } from "../lib/password";
import { generateOpaqueToken, hashToken, signJwt } from "../lib/token";
import type { AuthUserResponse } from "../models/auth.model";
import { createSessionRepository } from "../repositories/session.repository";
import { createUserRepository } from "../repositories/user.repository";

const ACCESS_TOKEN_TTL_S = 15 * 60; // 15 minutes
const REFRESH_TOKEN_TTL_S = 7 * 24 * 3600; // 7 days

// ── Types ─────────────────────────────────────────────────────────────────────

export type LoginResult = {
  accessToken: string;
  refreshToken: string;
  user: AuthUserResponse;
};

export type RefreshResult = {
  accessToken: string;
  user: AuthUserResponse;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function authError(code: string, message: string): never {
  const err = new HTTPException(401, { message }) as HTTPException & { code: string };
  err.code = code;
  throw err;
}

// ── Factory ───────────────────────────────────────────────────────────────────

export type AuthService = ReturnType<typeof createAuthService>;

export function createAuthService(db: Database) {
  const userRepo = createUserRepository(db);
  const sessionRepo = createSessionRepository(db);

  return {
    async login(email: string, password: string, jwtSecret: string): Promise<LoginResult> {
      const user = await userRepo.findByEmail(email);
      if (!user) authError("INVALID_CREDENTIALS", "Invalid email or password");

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) authError("INVALID_CREDENTIALS", "Invalid email or password");

      if (!user.isActive) authError("ACCOUNT_DISABLED", "Account is disabled");

      // Cleanup expired sessions for this user on login
      await sessionRepo.deleteExpiredByUserId(user.id);

      const rawRefreshToken = generateOpaqueToken();
      const tokenHash = await hashToken(rawRefreshToken);
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_S * 1000);

      await sessionRepo.create({ userId: user.id, tokenHash, expiresAt });

      const accessToken = await signJwt(
        { sub: user.id, email: user.email, name: user.name, role: user.role },
        jwtSecret,
        ACCESS_TOKEN_TTL_S,
      );

      return {
        accessToken,
        refreshToken: rawRefreshToken,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      };
    },

    async refresh(rawRefreshToken: string, jwtSecret: string): Promise<RefreshResult> {
      const hash = await hashToken(rawRefreshToken);
      const session = await sessionRepo.findByTokenHash(hash);
      if (!session) authError("INVALID_TOKEN", "Invalid refresh token");

      if (new Date(session.expiresAt) <= new Date()) {
        authError("TOKEN_EXPIRED", "Refresh token has expired");
      }

      const user = await userRepo.findById(session.userId);
      if (!user) authError("INVALID_TOKEN", "Invalid refresh token");

      if (!user.isActive) authError("ACCOUNT_DISABLED", "Account is disabled");

      const accessToken = await signJwt(
        { sub: user.id, email: user.email, name: user.name, role: user.role },
        jwtSecret,
        ACCESS_TOKEN_TTL_S,
      );

      return {
        accessToken,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      };
    },

    async logout(rawRefreshToken: string): Promise<void> {
      const hash = await hashToken(rawRefreshToken);
      // Silently ignore if session not found (already logged out or invalid token)
      await sessionRepo.deleteByTokenHash(hash);
    },
  };
}
