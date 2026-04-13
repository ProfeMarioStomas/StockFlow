import { useQuery } from "@tanstack/react-query";
import type { SaleResponse } from "../../../models/sale.model";
import { paymentMethodLabels } from "../../../models/sale.model";
import { productService } from "../../../services/product.service";
import { userService } from "../../../services/user.service";
import { Button } from "../../common/Button";
import { Modal } from "../../common/Modal";

interface SaleReceiptModalProps {
  sale: SaleResponse;
  open: boolean;
  onClose: () => void;
}

const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function shortId(id: string): string {
  return id.slice(-8).toUpperCase();
}

export function SaleReceiptModal({ sale, open, onClose }: SaleReceiptModalProps) {
  const { data: products = [] } = useQuery({
    queryKey: ["products", "all"],
    queryFn: () => productService.listAll(),
    staleTime: 60_000,
    enabled: open,
  });

  const { data: seller } = useQuery({
    queryKey: ["users", sale.sellerId],
    queryFn: () => userService.getUserById(sale.sellerId),
    staleTime: 5 * 60_000,
    enabled: open,
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  function handlePrint() {
    const saleDate = new Date(sale.createdAt).toLocaleString();
    const sellerName = seller?.name ?? sale.sellerId;

    const rows = sale.details
      .map((d) => {
        const product = productMap.get(d.productId);
        const name = product?.name ?? d.productId;
        const subtotal = d.quantity * d.unitPrice;
        return `
          <tr>
            <td>${name}</td>
            <td style="text-align:center">${d.quantity}</td>
            <td style="text-align:right">${fmt.format(d.unitPrice)}</td>
            <td style="text-align:right">${fmt.format(subtotal)}</td>
          </tr>`;
      })
      .join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Receipt #${shortId(sale.id)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 32px; max-width: 480px; margin: 0 auto; }
    h1 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
    .subtitle { font-size: 12px; color: #555; margin-bottom: 20px; }
    .meta { margin-bottom: 20px; }
    .meta-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #eee; font-size: 12px; }
    .meta-row:last-child { border-bottom: none; }
    .meta-label { color: #555; }
    .meta-value { font-weight: 500; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { text-align: left; font-size: 11px; color: #555; border-bottom: 1px solid #ccc; padding: 6px 4px; }
    td { padding: 6px 4px; font-size: 12px; border-bottom: 1px solid #eee; }
    .total-row td { border-top: 2px solid #111; border-bottom: none; font-weight: 700; font-size: 13px; padding-top: 10px; }
    .footer { text-align: center; font-size: 11px; color: #888; margin-top: 24px; }
  </style>
</head>
<body>
  <h1>StockFlow</h1>
  <p class="subtitle">Sale Receipt</p>

  <div class="meta">
    <div class="meta-row">
      <span class="meta-label">Receipt #</span>
      <span class="meta-value">${shortId(sale.id)}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">Date &amp; Time</span>
      <span class="meta-value">${saleDate}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">Seller</span>
      <span class="meta-value">${sellerName}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">Payment</span>
      <span class="meta-value">${paymentMethodLabels[sale.paymentMethod]}</span>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Product</th>
        <th style="text-align:center">Qty</th>
        <th style="text-align:right">Unit Price</th>
        <th style="text-align:right">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="3" style="text-align:right">Total</td>
        <td style="text-align:right">${fmt.format(sale.totalAmount)}</td>
      </tr>
    </tfoot>
  </table>

  <p class="footer">Thank you for your purchase.</p>
</body>
</html>`;

    const win = window.open("", "_blank", "width=560,height=720");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Receipt #${shortId(sale.id)}`}
      description={`${new Date(sale.createdAt).toLocaleString()} · ${paymentMethodLabels[sale.paymentMethod]}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" size="sm" onClick={handlePrint}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect width="12" height="8" x="6" y="14" />
            </svg>
            Print
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Meta info */}
        <div className="grid grid-cols-2 gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 text-sm">
          <div>
            <p className="text-[var(--color-muted-foreground)]">Seller</p>
            <p className="mt-1 font-medium text-[var(--color-foreground)]">
              {seller ? (
                seller.name
              ) : (
                <span className="animate-pulse text-[var(--color-muted-foreground)]">Loading…</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-[var(--color-muted-foreground)]">Total</p>
            <p className="mt-1 text-lg font-semibold text-[var(--color-foreground)]">
              {fmt.format(sale.totalAmount)}
            </p>
          </div>
        </div>

        {/* Line items */}
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
                    <td className="px-4 py-3 font-medium text-[var(--color-foreground)]">
                      {product?.name ?? (
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
