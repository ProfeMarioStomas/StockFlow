import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useCurrentUser } from "../../hooks/useCurrentUser";

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Wraps authenticated pages.
 * Redirects to /login if the user is not authenticated.
 * Shows a loading state while the auth check is in flight.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoading, isError } = useCurrentUser();

  if (isLoading) {
    // TODO: replace with a proper PageSpinner component
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  if (isError) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
