import axios, { type AxiosError } from "axios";
import { queryClient } from "../lib/queryClient";

export const api = axios.create({
  baseURL: "/api/v1",
  withCredentials: true, // send httpOnly cookies automatically
});

// Tracks configs currently being retried to prevent infinite refresh loops.
// One retry per request — if refresh fails, redirect to /login.
const retriedRequests = new WeakSet<object>();

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config;

    if (
      error.response?.status === 401 &&
      config &&
      !retriedRequests.has(config) &&
      !config.url?.includes("/auth/refresh") &&
      !config.url?.includes("/auth/me")
    ) {
      retriedRequests.add(config);

      try {
        // Attempt to refresh — browser sends the refresh cookie automatically
        await api.post("/auth/refresh");
        // Retry the original request once
        return await api(config);
      } catch {
        // Refresh failed — clear all cached data and redirect to login
        queryClient.clear();
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);
