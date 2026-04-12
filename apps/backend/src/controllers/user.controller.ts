import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { getConfig } from "../config";
import { createDb } from "../db/client";
import { throwValidationError } from "../lib/validation";
import {
  ErrorResponseSchema,
  PaginationQuerySchema,
  paginatedSchema,
} from "../models/common.model";
import {
  ChangePasswordSchema,
  CreateUserSchema,
  UpdateUserSchema,
  UserResponseSchema,
} from "../models/user.model";
import { createUserService } from "../services/user.service";
import type { AppContext } from "../types";

const PaginatedUsersSchema = paginatedSchema(UserResponseSchema).openapi("PaginatedUsers");

// ── Shared schemas ────────────────────────────────────────────────────────────

const IdParamSchema = z.object({
  id: z.uuid().openapi({ example: "00000000-0000-0000-0000-000000000001" }),
});

// ── Error response shorthand ──────────────────────────────────────────────────

const errorBody = (description: string) => ({
  content: { "application/json": { schema: ErrorResponseSchema } },
  description,
});

// ── Router ────────────────────────────────────────────────────────────────────

export const usersRouter = new OpenAPIHono<AppContext>({
  defaultHook: (result, _c) => {
    if (!result.success) throwValidationError(result.error);
  },
});

// ── Route definitions ─────────────────────────────────────────────────────────

const listUsersRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Users"],
  summary: "List users (paginated)",
  request: { query: PaginationQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: PaginatedUsersSchema } },
      description: "Returns a paginated list of users",
    },
  },
});

const getUserRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Users"],
  summary: "Get a user by ID",
  request: { params: IdParamSchema },
  responses: {
    200: {
      content: { "application/json": { schema: UserResponseSchema } },
      description: "User found",
    },
    404: errorBody("User not found"),
  },
});

const createUserRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Users"],
  summary: "Create a new user",
  request: {
    body: {
      content: { "application/json": { schema: CreateUserSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: UserResponseSchema } },
      description: "User created",
    },
    400: errorBody("Validation error"),
    409: errorBody("Email already in use"),
  },
});

const updateUserRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Users"],
  summary: "Update a user",
  request: {
    params: IdParamSchema,
    body: {
      content: { "application/json": { schema: UpdateUserSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: UserResponseSchema } },
      description: "User updated",
    },
    400: errorBody("Validation error"),
    404: errorBody("User not found"),
    409: errorBody("Email already in use"),
  },
});

const changePasswordRoute = createRoute({
  method: "put",
  path: "/{id}/password",
  tags: ["Users"],
  summary: "Change user password",
  request: {
    params: IdParamSchema,
    body: {
      content: { "application/json": { schema: ChangePasswordSchema } },
      required: true,
    },
  },
  responses: {
    204: { description: "Password changed successfully" },
    400: errorBody("Validation error"),
    404: errorBody("User not found"),
    422: errorBody("Current password is incorrect"),
  },
});

const deleteUserRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Users"],
  summary: "Soft-delete a user",
  request: { params: IdParamSchema },
  responses: {
    204: { description: "User deleted" },
    404: errorBody("User not found"),
  },
});

// ── Handlers ──────────────────────────────────────────────────────────────────

usersRouter.openapi(listUsersRoute, async (c) => {
  const { page, pageSize } = c.req.valid("query");
  const config = getConfig(c.env);
  const db = createDb(config.DATABASE_URL);
  const service = createUserService(db);
  const result = await service.listUsers(page, pageSize);
  return c.json(result, 200);
});

usersRouter.openapi(getUserRoute, async (c) => {
  const { id } = c.req.valid("param");
  const config = getConfig(c.env);
  const db = createDb(config.DATABASE_URL);
  const service = createUserService(db);
  const user = await service.getUserById(id);
  return c.json(user, 200);
});

usersRouter.openapi(createUserRoute, async (c) => {
  const body = c.req.valid("json");
  const config = getConfig(c.env);
  const db = createDb(config.DATABASE_URL);
  const service = createUserService(db);
  const user = await service.createUser(body);
  return c.json(user, 201);
});

usersRouter.openapi(updateUserRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const config = getConfig(c.env);
  const db = createDb(config.DATABASE_URL);
  const service = createUserService(db);
  const user = await service.updateUser(id, body);
  return c.json(user, 200);
});

usersRouter.openapi(changePasswordRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const config = getConfig(c.env);
  const db = createDb(config.DATABASE_URL);
  const service = createUserService(db);
  await service.changePassword(id, body);
  return c.body(null, 204);
});

usersRouter.openapi(deleteUserRoute, async (c) => {
  const { id } = c.req.valid("param");
  const config = getConfig(c.env);
  const db = createDb(config.DATABASE_URL);
  const service = createUserService(db);
  await service.deleteUser(id);
  return c.body(null, 204);
});
