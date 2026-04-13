import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/common/ProtectedRoute";
import { AppLayout } from "./components/layouts/AppLayout";
import { queryClient } from "./lib/queryClient";
import { DashboardPage } from "./pages/DashboardPage";
import { InventoryReceiptsPage } from "./pages/InventoryReceiptsPage";
import { LoginPage } from "./pages/LoginPage";
import { ProductsPage } from "./pages/ProductsPage";
import { SalesPage } from "./pages/SalesPage";
import { SystemLogsPage } from "./pages/SystemLogsPage";
import { UsersPage } from "./pages/UsersPage";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout title="Dashboard">
                  <DashboardPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <AppLayout title="Products">
                  <ProductsPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales"
            element={
              <ProtectedRoute>
                <AppLayout title="Sales">
                  <SalesPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory-receipts"
            element={
              <ProtectedRoute>
                <AppLayout title="Inventory Receipts">
                  <InventoryReceiptsPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <AppLayout title="Users">
                  <UsersPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/logs"
            element={
              <ProtectedRoute>
                <AppLayout title="System Logs">
                  <SystemLogsPage />
                </AppLayout>
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
