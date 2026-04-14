import { api } from "./api";

export type LoginPayload = {
  email: string;
  password: string;
};

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "seller";
};

export const authService = {
  login: (payload: LoginPayload) => api.post<void>("/auth/login", payload),

  logout: () => api.post<void>("/auth/logout"),

  refresh: () => api.post<void>("/auth/refresh"),

  me: () => api.get<CurrentUser>("/auth/me").then((r) => r.data),
};
