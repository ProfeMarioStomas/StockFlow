import { z } from "@hono/zod-openapi";

// ── Schemas ───────────────────────────────────────────────────────────────────

export const CreateUserSchema = z
  .object({
    name: z
      .string()
      .min(1, { error: "Name is required" })
      .max(255)
      .openapi({ example: "John Doe" }),
    email: z.email({ error: "Invalid email address" }).openapi({ example: "john@example.com" }),
    password: z
      .string()
      .min(8, { error: "Password must be at least 8 characters" })
      .openapi({ example: "••••••••", format: "password" }),
    role: z.enum(["admin", "seller"], { error: "Role must be admin or seller" }).openapi({
      example: "seller",
    }),
  })
  .openapi("CreateUserInput");

export const UpdateUserSchema = z
  .object({
    name: z
      .string()
      .min(1, { error: "Name is required" })
      .max(255)
      .openapi({ example: "Jane Doe" })
      .optional(),
    email: z
      .email({ error: "Invalid email address" })
      .openapi({ example: "jane@example.com" })
      .optional(),
    role: z
      .enum(["admin", "seller"], { error: "Role must be admin or seller" })
      .openapi({ example: "seller" })
      .optional(),
    isActive: z.boolean().openapi({ example: true }).optional(),
  })
  .openapi("UpdateUserInput");

export const ChangePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, { error: "Current password is required" })
      .openapi({ example: "••••••••", format: "password" }),
    newPassword: z
      .string()
      .min(8, { error: "New password must be at least 8 characters" })
      .openapi({ example: "••••••••", format: "password" }),
  })
  .openapi("ChangePasswordInput");

export const UserResponseSchema = z
  .object({
    id: z.uuid().openapi({ example: "00000000-0000-0000-0000-000000000001" }),
    name: z.string().openapi({ example: "John Doe" }),
    email: z.email().openapi({ example: "john@example.com" }),
    role: z.enum(["admin", "seller"]).openapi({ example: "seller" }),
    isActive: z.boolean().openapi({ example: true }),
    createdAt: z.string().openapi({ example: "2024-01-01T00:00:00.000Z" }),
    updatedAt: z.string().openapi({ example: "2024-01-01T00:00:00.000Z" }),
  })
  .openapi("UserResponse");

// ── Inferred types ────────────────────────────────────────────────────────────

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
