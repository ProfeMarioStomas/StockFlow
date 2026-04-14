import type { StockStatusData } from "../../../models/report.model";
import { Badge } from "../../common/Badge";
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

interface StockStatusTableProps {
  data: StockStatusData | undefined;
  criticalOnly: boolean;
  onCriticalOnlyChange: (value: boolean) => void;
}

export function StockStatusTable({
  data,
  criticalOnly,
  onCriticalOnlyChange,
}: StockStatusTableProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-[var(--color-foreground)]">Estado del stock</h3>
          {data && data.criticalCount > 0 && (
            <Badge variant="destructive">
              {data.criticalCount} crítico{data.criticalCount !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
          <input
            type="checkbox"
            checked={criticalOnly}
            onChange={(e) => onCriticalOnlyChange(e.target.checked)}
            className="h-4 w-4 cursor-pointer rounded border-[var(--color-input)] accent-[var(--color-accent)]"
          />
          Solo críticos
        </label>
      </div>

      <TableWrapper>
        <Table>
          <TableHead>
            <tr>
              <TableHeader>Producto</TableHeader>
              <TableHeader>Código</TableHeader>
              <TableHeader className="text-right">Stock</TableHeader>
              <TableHeader className="text-right">Stock crítico</TableHeader>
              <TableHeader className="text-right">Estado</TableHeader>
            </tr>
          </TableHead>
          <TableBody>
            {!data || data.products.length === 0 ? (
              <TableEmpty colSpan={5} message="Sin productos." />
            ) : (
              data.products.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-[var(--color-muted-foreground)]">
                    {item.barcode}
                  </TableCell>
                  <TableCell className="text-right">{item.stock}</TableCell>
                  <TableCell className="text-right text-[var(--color-muted-foreground)]">
                    {item.criticalStock ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.isCritical ? (
                      <Badge variant="destructive">Crítico</Badge>
                    ) : (
                      <Badge variant="success">OK</Badge>
                    )}
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
