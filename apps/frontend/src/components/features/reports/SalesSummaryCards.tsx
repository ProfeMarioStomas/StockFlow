import type { SalesSummaryData } from "../../../models/report.model";

interface SalesSummaryCardsProps {
  data: SalesSummaryData;
}

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
}

function KpiCard({ label, value, sub }: KpiCardProps) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-[var(--color-foreground)]">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">{sub}</p>}
    </div>
  );
}

export function SalesSummaryCards({ data }: SalesSummaryCardsProps) {
  const revenue = parseFloat(data.totalRevenue).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const avgTicket = parseFloat(data.avgTicket).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="grid grid-cols-3 gap-4">
      <KpiCard label="Ingresos totales" value={`$${revenue}`} />
      <KpiCard
        label="Total de ventas"
        value={data.totalSales.toLocaleString("es-MX")}
        sub="ventas registradas"
      />
      <KpiCard label="Ticket promedio" value={`$${avgTicket}`} sub="por venta" />
    </div>
  );
}
