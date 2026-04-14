import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { PageSpinner } from "./Spinner";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoading, isError } = useCurrentUser();

  if (isLoading) return <PageSpinner />;
  if (isError) return <Navigate to="/login" replace />;

  return children;
}
