import { HTTPException } from "hono/http-exception";
import type { Database } from "../db/client";
import { hashPassword, verifyPassword } from "../lib/password";
import { cache } from "../lib/cache";
import type {
  CreateUserInput,
  UpdateUserInput,
  ChangePasswordInput,
  UserResponse,
} from "../models/user.model";
import { createUserRepository } from "../repositories/user.repository";

const TTL_5MIN = 5 * 60 * 1000;

function toUserResponse(record: {
  id: string;
  name: string;
  email: string;
  role: "admin" | "seller";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}): UserResponse {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    role: record.role,
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export type UserService = ReturnType<typeof createUserService>;

export function createUserService(db: Database) {
  const repo = createUserRepository(db);

  return {
    async listUsers(): Promise<UserResponse[]> {
      const cached = cache.get<UserResponse[]>("users:list");
      if (cached) return cached;

      const records = await repo.findAll();
      const result = records.map(toUserResponse);
      cache.set("users:list", result, TTL_5MIN);
      return result;
    },

    async getUserById(id: string): Promise<UserResponse> {
      const cached = cache.get<UserResponse>(`users:${id}`);
      if (cached) return cached;

      const record = await repo.findById(id);
      if (!record) {
        throw new HTTPException(404, { message: "User not found" });
      }

      const result = toUserResponse(record);
      cache.set(`users:${id}`, result, TTL_5MIN);
      return result;
    },

    async createUser(input: CreateUserInput): Promise<UserResponse> {
      const existing = await repo.findByEmail(input.email);
      if (existing) {
        throw new HTTPException(409, { message: "A user with this email already exists" });
      }

      const passwordHash = await hashPassword(input.password);
      const record = await repo.create({
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
      });

      cache.invalidate("users:list");
      return toUserResponse(record);
    },

    async updateUser(id: string, input: UpdateUserInput): Promise<UserResponse> {
      const existing = await repo.findById(id);
      if (!existing) {
        throw new HTTPException(404, { message: "User not found" });
      }

      if (input.email && input.email !== existing.email) {
        const emailOwner = await repo.findByEmail(input.email);
        if (emailOwner) {
          throw new HTTPException(409, { message: "A user with this email already exists" });
        }
      }

      const updated = await repo.update(id, input);
      if (!updated) {
        throw new HTTPException(404, { message: "User not found" });
      }

      cache.invalidate(`users:${id}`);
      cache.invalidate("users:list");
      return toUserResponse(updated);
    },

    async changePassword(id: string, input: ChangePasswordInput): Promise<void> {
      const record = await repo.findById(id);
      if (!record) {
        throw new HTTPException(404, { message: "User not found" });
      }

      const isValid = await verifyPassword(input.currentPassword, record.passwordHash);
      if (!isValid) {
        throw new HTTPException(422, { message: "Current password is incorrect" });
      }

      const newPasswordHash = await hashPassword(input.newPassword);
      await repo.update(id, { passwordHash: newPasswordHash });
    },

    async deleteUser(id: string): Promise<void> {
      const existing = await repo.findById(id);
      if (!existing) {
        throw new HTTPException(404, { message: "User not found" });
      }

      await repo.softDelete(id);
      cache.invalidate(`users:${id}`);
      cache.invalidate("users:list");
    },
  };
}
