import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PaymentMethodChart } from "../components/features/reports/PaymentMethodChart";
import { SalesSummaryCards } from "../components/features/reports/SalesSummaryCards";
import { StockMovementChart } from "../components/features/reports/StockMovementChart";
import { StockStatusTable } from "../components/features/reports/StockStatusTable";
import { TopProductsTable } from "../components/features/reports/TopProductsTable";
import { cn } from "../lib/cn";
import { reportService } from "../services/report.service";
import { useCurrentUser } from "../hooks/useCurrentUser";

type Tab = "sales" | "inventory";

function getDefaultDates() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().split("T")[0]!,
    to: to.toISOString().split("T")[0]!,
  };
}

const STALE_TIME = 5 * 60_000;

export function ReportsPage() {
  const { data: currentUser } = useCurrentUser();
  const [tab, setTab] = useState<Tab>("sales");
  const [from, setFrom] = useState(() => getDefaultDates().from);
  const [to, setTo] = useState(() => getDefaultDates().to);
  const [limit, setLimit] = useState(10);
  const [criticalOnly, setCriticalOnly] = useState(false);

  const fromISO = from ? `${from}T00:00:00.000Z` : undefined;
  const toISO = to ? `${to}T23:59:59.999Z` : undefined;

  const salesSummaryQuery = useQuery({
    queryKey: ["reports", "sales-summary", { from, to }],
    queryFn: () => reportService.getSalesSummary({ from: fromISO, to: toISO }),
    staleTime: STALE_TIME,
    enabled: currentUser?.role === "admin",
  });

  const topProductsQuery = useQuery({
    queryKey: ["reports", "top-products", { from, to, limit }],
    queryFn: () => reportService.getTopProducts({ from: fromISO, to: toISO, limit }),
    staleTime: STALE_TIME,
    enabled: currentUser?.role === "admin",
  });

  const stockStatusQuery = useQuery({
    queryKey: ["reports", "stock-status", { criticalOnly }],
    queryFn: () => reportService.getStockStatus({ criticalOnly }),
    staleTime: STALE_TIME,
    enabled: currentUser?.role === "admin",
  });

  const stockMovementQuery = useQuery({
    queryKey: ["reports", "stock-movement", { from, to }],
    queryFn: () => reportService.getStockMovement({ from: fromISO, to: toISO }),
    staleTime: STALE_TIME,
    enabled: currentUser?.role === "admin",
  });

  if (currentUser && currentUser.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-2">
        <p className="text-sm font-medium text-[var(--color-foreground)]">Acceso restringido</p>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Solo los administradores pueden ver los reportes.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">Reportes</h2>
          <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
            Últimos 30 días por defecto
          </p>
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--color-muted-foreground)]">Desde</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-8 rounded-[var(--radius-md)] border border-[var(--color-input)] bg-[var(--color-surface)] px-2 text-xs text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
          />
          <label className="text-xs text-[var(--color-muted-foreground)]">Hasta</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-8 rounded-[var(--radius-md)] border border-[var(--color-input)] bg-[var(--color-surface)] px-2 text-xs text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
          />
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 self-start rounded-[var(--radius-md)] bg-[var(--color-muted)] p-1">
        {(["sales", "inventory"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-[var(--radius-sm)] px-4 py-1.5 text-sm font-medium transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
              tab === t
                ? "bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-sm"
                : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
            )}
          >
            {t === "sales" ? "Ventas" : "Inventario"}
          </button>
        ))}
      </div>

      {/* Sales tab */}
      {tab === "sales" && (
        <div className="flex flex-col gap-6">
          {salesSummaryQuery.isLoading ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">Cargando...</p>
          ) : salesSummaryQuery.data ? (
            <SalesSummaryCards data={salesSummaryQuery.data.data} />
          ) : null}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {salesSummaryQuery.isLoading ? (
              <div className="flex h-[280px] items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
                <p className="text-sm text-[var(--color-muted-foreground)]">Cargando...</p>
              </div>
            ) : salesSummaryQuery.data ? (
              <PaymentMethodChart data={salesSummaryQuery.data.data.byPaymentMethod} />
            ) : null}

            <TopProductsTable
              data={topProductsQuery.data?.data ?? []}
              limit={limit}
              onLimitChange={setLimit}
            />
          </div>
        </div>
      )}

      {/* Inventory tab */}
      {tab === "inventory" && (
        <div className="flex flex-col gap-6">
          <StockStatusTable
            data={stockStatusQuery.data?.data}
            criticalOnly={criticalOnly}
            onCriticalOnlyChange={setCriticalOnly}
          />

          {stockMovementQuery.isLoading ? (
            <div className="flex h-[300px] items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
              <p className="text-sm text-[var(--color-muted-foreground)]">Cargando...</p>
            </div>
          ) : stockMovementQuery.data ? (
            <StockMovementChart data={stockMovementQuery.data.data} />
          ) : null}
        </div>
      )}
    </div>
  );
}
