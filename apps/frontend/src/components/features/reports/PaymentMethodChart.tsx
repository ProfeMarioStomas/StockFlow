import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { PaymentMethodBreakdown } from "../../../models/report.model";

// Hardcoded hex values required — SVG fill attributes don't support CSS custom properties.
// Colors match the app's palette: accent (#059669), info (#2563eb), warning (#d97706).
const METHOD_COLORS: Record<string, string> = {
  cash: "#059669",
  card: "#2563eb",
  transfer: "#d97706",
};

const METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
};

interface PaymentMethodChartProps {
  data: PaymentMethodBreakdown[];
}

export function PaymentMethodChart({ data }: PaymentMethodChartProps) {
  const chartData = data.map((d) => ({
    name: METHOD_LABELS[d.method] ?? d.method,
    method: d.method,
    value: parseFloat(d.revenue),
    count: d.count,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
        <p className="text-sm text-[var(--color-muted-foreground)]">Sin datos</p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h3 className="mb-4 text-sm font-medium text-[var(--color-foreground)]">
        Por método de pago
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
          >
            {chartData.map((entry) => (
              <Cell key={entry.method} fill={METHOD_COLORS[entry.method] ?? "#94a3b8"} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [
              `$${Number(value).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
              "Revenue",
            ]}
          />
          <Legend
            formatter={(value) => (
              <span style={{ color: "#64748b", fontSize: "12px" }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
