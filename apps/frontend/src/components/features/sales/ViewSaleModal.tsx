import { useQuery } from "@tanstack/react-query";
import type { SaleResponse } from "../../../models/sale.model";
import { paymentMethodLabels } from "../../../models/sale.model";
import { productService } from "../../../services/product.service";
import { Badge } from "../../common/Badge";
import { Button } from "../../common/Button";
import { Modal } from "../../common/Modal";

interface ViewSaleModalProps {
  sale: SaleResponse;
  open: boolean;
  onClose: () => void;
}

const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function ViewSaleModal({ sale, open, onClose }: ViewSaleModalProps) {
  const { data: products = [] } = useQuery({
    queryKey: ["products", "all"],
    queryFn: () => productService.listAll(),
    staleTime: 60_000,
    enabled: open,
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Sale Details"
      description={`Created on ${new Date(sale.createdAt).toLocaleString()}`}
      size="lg"
      footer={
        <Button variant="secondary" size="sm" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Header info */}
        <div className="grid grid-cols-3 gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 text-sm">
          <div>
            <p className="text-[var(--color-muted-foreground)]">Total</p>
            <p className="mt-1 text-lg font-semibold text-[var(--color-foreground)]">
              {fmt.format(sale.totalAmount)}
            </p>
          </div>
          <div>
            <p className="text-[var(--color-muted-foreground)]">Payment</p>
            <p className="mt-1 font-medium text-[var(--color-foreground)]">
              {paymentMethodLabels[sale.paymentMethod]}
            </p>
          </div>
          <div>
            <p className="text-[var(--color-muted-foreground)]">Status</p>
            <div className="mt-1">
              <Badge variant={sale.isActive ? "success" : "destructive"}>
                {sale.isActive ? "Active" : "Voided"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Items table */}
        <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/40">
                <th className="px-4 py-2.5 text-left font-medium text-[var(--color-muted-foreground)]">
                  Product
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-[var(--color-muted-foreground)]">
                  Qty
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-[var(--color-muted-foreground)]">
                  Unit Price
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-[var(--color-muted-foreground)]">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody>
              {sale.details.map((detail) => {
                const product = productMap.get(detail.productId);
                const subtotal = detail.quantity * detail.unitPrice;
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
                    <td className="px-4 py-3 text-right text-[var(--color-foreground)]">
                      {detail.quantity}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--color-foreground)]">
                      {fmt.format(detail.unitPrice)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[var(--color-foreground)]">
                      {fmt.format(subtotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-[var(--color-border)] bg-[var(--color-muted)]/40">
                <td
                  colSpan={3}
                  className="px-4 py-2.5 text-right text-sm font-medium text-[var(--color-muted-foreground)]"
                >
                  Total
                </td>
                <td className="px-4 py-2.5 text-right text-sm font-semibold text-[var(--color-foreground)]">
                  {fmt.format(sale.totalAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </Modal>
  );
}
