import type { TopProductItem } from "../../../models/report.model";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from "../../common/Table";

interface TopProductsTableProps {
  data: TopProductItem[];
  limit: number;
  onLimitChange: (value: number) => void;
}

export function TopProductsTable({ data, limit, onLimitChange }: TopProductsTableProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--color-foreground)]">
          Productos más vendidos
        </h3>
        <select
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          className="h-8 rounded-[var(--radius-md)] border border-[var(--color-input)] bg-[var(--color-surface)] px-2 text-xs text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
        >
          <option value={10}>Top 10</option>
          <option value={25}>Top 25</option>
          <option value={50}>Top 50</option>
        </select>
      </div>

      <TableWrapper>
        <Table>
          <TableHead>
            <tr>
              <TableHeader className="w-10">#</TableHeader>
              <TableHeader>Producto</TableHeader>
              <TableHeader>Código</TableHeader>
              <TableHeader className="text-right">Unidades</TableHeader>
              <TableHeader className="text-right">Revenue</TableHeader>
            </tr>
          </TableHead>
          <TableBody>
            {data.length === 0 ? (
              <TableEmpty colSpan={5} message="Sin ventas en el período." />
            ) : (
              data.map((item, index) => (
                <TableRow key={item.productId}>
                  <TableCell className="text-[var(--color-muted-foreground)]">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-medium">{item.productName}</TableCell>
                  <TableCell className="text-[var(--color-muted-foreground)]">
                    {item.barcode}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.totalUnits.toLocaleString("es-MX")}
                  </TableCell>
                  <TableCell className="text-right">
                    $
                    {parseFloat(item.totalRevenue).toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableWrapper>
    </div>
  );
}
