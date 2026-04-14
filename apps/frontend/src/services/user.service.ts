import type {
  ChangePasswordInput,
  CreateUserFormValues,
  PaginatedUsersResponse,
  UpdateUserFormValues,
  UserResponse,
} from "../models/user.model";
import { api } from "./api";

export const userService = {
  listUsers: (page: number, pageSize: number) =>
    api.get<PaginatedUsersResponse>("/users", { params: { page, pageSize } }).then((r) => r.data),

  createUser: (data: CreateUserFormValues) =>
    api.post<UserResponse>("/users", data).then((r) => r.data),

  updateUser: (id: string, data: UpdateUserFormValues) =>
    api.put<UserResponse>(`/users/${id}`, data).then((r) => r.data),

  deleteUser: (id: string) => api.delete<void>(`/users/${id}`),

  getUserById: (id: string) => api.get<UserResponse>(`/users/${id}`).then((r) => r.data),

  changePassword: (id: string, data: ChangePasswordInput) =>
    api.put(`/users/${id}/password`, data).then((r) => r.data),
};
