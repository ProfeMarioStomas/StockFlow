import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { StockMovementItem } from "../../../models/report.model";

// Hardcoded hex values required — SVG fill attributes don't support CSS custom properties.
const COLOR_IN = "#059669"; // accent / success
const COLOR_OUT = "#dc2626"; // destructive

interface StockMovementChartProps {
  data: StockMovementItem[];
}

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

export function StockMovementChart({ data }: StockMovementChartProps) {
  // Top 15 by total volume (unitsIn + unitsOut), already sorted by backend
  const chartData = data.slice(0, 15).map((item) => ({
    name: truncate(item.productName, 14),
    Entradas: item.unitsIn,
    Salidas: item.unitsOut,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
        <p className="text-sm text-[var(--color-muted-foreground)]">Sin movimiento en el período</p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h3 className="mb-4 text-sm font-medium text-[var(--color-foreground)]">
        Movimiento de stock — top {Math.min(data.length, 15)} productos
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 0, right: 8, left: 0, bottom: 64 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="name"
            angle={-40}
            textAnchor="end"
            tick={{ fontSize: 11, fill: "#64748b" }}
            interval={0}
          />
          <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
          <Tooltip />
          <Legend
            wrapperStyle={{ paddingTop: "8px" }}
            formatter={(value) => (
              <span style={{ color: "#64748b", fontSize: "12px" }}>{value}</span>
            )}
          />
          <Bar dataKey="Entradas" fill={COLOR_IN} radius={[2, 2, 0, 0]} maxBarSize={32} />
          <Bar dataKey="Salidas" fill={COLOR_OUT} radius={[2, 2, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
