import { useQuery } from "@tanstack/react-query";
import { authService } from "../services/auth.service";

/**
 * Source of truth for auth state.
 * Returns the current user from GET /api/v1/auth/me.
 * isError === true means the user is not authenticated (401).
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authService.me(),
    retry: false, // don't retry on 401
    staleTime: 5 * 60_000, // 5 minutes
  });
}
