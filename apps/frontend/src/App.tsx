import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/common/ProtectedRoute";
import { queryClient } from "./lib/queryClient";

// Import page components here as they are created:
// import { LoginPage } from "./pages/LoginPage";
// import { DashboardPage } from "./pages/DashboardPage";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<div>Login Page — TODO</div>} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <div>Dashboard — TODO</div>
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
