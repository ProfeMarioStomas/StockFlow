import { useQuery } from "@tanstack/react-query";
import { Badge } from "../../common/Badge";
import { Button } from "../../common/Button";
import { Modal } from "../../common/Modal";
import type { InventoryReceiptResponse } from "../../../models/inventory-receipt.model";
import { productService } from "../../../services/product.service";

interface ViewReceiptModalProps {
  receipt: InventoryReceiptResponse;
  open: boolean;
  onClose: () => void;
}

export function ViewReceiptModal({ receipt, open, onClose }: ViewReceiptModalProps) {
  const { data: products = [] } = useQuery({
    queryKey: ["products", "all"],
    queryFn: () => productService.listAll(),
    staleTime: 60_000,
    enabled: open,
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  const totalUnits = receipt.details.reduce((sum, d) => sum + d.quantity, 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Detalles del Recibo"
      description={`Creado el ${new Date(receipt.createdAt).toLocaleString()}`}
      size="lg"
      footer={
        <Button variant="secondary" size="sm" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Header info */}
        <div className="grid grid-cols-2 gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 text-sm">
          <div>
            <p className="text-[var(--color-muted-foreground)]">Estado</p>
            <div className="mt-1">
              <Badge variant={receipt.isActive ? "success" : "destructive"}>
                {receipt.isActive ? "Activo" : "Anulado"}
              </Badge>
            </div>
          </div>
          <div>
            <p className="text-[var(--color-muted-foreground)]">Unidades Totales</p>
            <p className="mt-1 font-medium text-[var(--color-foreground)]">{totalUnits}</p>
          </div>
          {receipt.notes && (
            <div className="col-span-2">
              <p className="text-[var(--color-muted-foreground)]">Notas</p>
              <p className="mt-1 text-[var(--color-foreground)]">{receipt.notes}</p>
            </div>
          )}
        </div>

        {/* Items table */}
        <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/40">
                <th className="px-4 py-2.5 text-left font-medium text-[var(--color-muted-foreground)]">
                  Producto
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-[var(--color-muted-foreground)]">
                  Cantidad
                </th>
              </tr>
            </thead>
            <tbody>
              {receipt.details.map((detail) => {
                const product = productMap.get(detail.productId);
                return (
                  <tr
                    key={detail.id}
                    className="border-b border-[var(--color-border)] last:border-0"
                  >
                    <td className="px-4 py-3 text-[var(--color-foreground)]">
                      {product ? (
                        <span className="font-medium">{product.name}</span>
                      ) : (
                        <span className="font-mono text-xs text-[var(--color-muted-foreground)]">
                          {detail.productId}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[var(--color-foreground)]">
                      {detail.quantity}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
