import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { Pagination } from "../components/common/Pagination";
import { PageSpinner } from "../components/common/Spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from "../components/common/Table";
import { CreateSaleModal } from "../components/features/sales/CreateSaleModal";
import { DeleteSaleModal } from "../components/features/sales/DeleteSaleModal";
import { EditSaleModal } from "../components/features/sales/EditSaleModal";
import { SaleReceiptModal } from "../components/features/sales/SaleReceiptModal";
import { ViewSaleModal } from "../components/features/sales/ViewSaleModal";
import type { SaleResponse } from "../models/sale.model";
import { paymentMethodLabels } from "../models/sale.model";
import { saleService } from "../services/sale.service";

type ModalState =
  | { type: "create" }
  | { type: "view"; sale: SaleResponse }
  | { type: "edit"; sale: SaleResponse }
  | { type: "delete"; sale: SaleResponse }
  | { type: "receipt"; sale: SaleResponse }
  | null;

const PAGE_SIZE = 20;

const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function SalesPage() {
  const [page, setPage] = useState(1);
  const [showInactive, setShowInactive] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["sales", { page, showInactive }],
    queryFn: () => saleService.listSales(page, PAGE_SIZE, showInactive ? undefined : true),
  });

  if (isLoading) return <PageSpinner />;

  const sales = data?.data ?? [];
  const meta = data?.meta;

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">Sales</h2>
            {meta && (
              <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
                {meta.total} {meta.total === 1 ? "sale" : "sales"}
                {showInactive ? " (including voided)" : ""}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => {
                  setShowInactive(e.target.checked);
                  setPage(1);
                }}
                className="h-4 w-4 cursor-pointer rounded border-[var(--color-input)] accent-[var(--color-accent)]"
              />
              Show voided
            </label>

            <Button variant="primary" size="sm" onClick={() => setModal({ type: "create" })}>
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
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
              New Sale
            </Button>
          </div>
        </div>

        {/* Table */}
        <TableWrapper>
          <Table>
            <TableHead>
              <tr>
                <TableHeader>Date</TableHeader>
                <TableHeader>Total</TableHeader>
                <TableHeader>Payment</TableHeader>
                <TableHeader>Items</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader className="text-right">Actions</TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {sales.length === 0 ? (
                <TableEmpty colSpan={6} message="No sales found." />
              ) : (
                sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="text-[var(--color-muted-foreground)]">
                      {new Date(sale.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium">{fmt.format(sale.totalAmount)}</TableCell>
                    <TableCell className="text-[var(--color-muted-foreground)]">
                      {paymentMethodLabels[sale.paymentMethod]}
                    </TableCell>
                    <TableCell>{sale.details.length}</TableCell>
                    <TableCell>
                      <Badge variant={sale.isActive ? "success" : "destructive"}>
                        {sale.isActive ? "Active" : "Voided"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setModal({ type: "receipt", sale })}
                          aria-label="View receipt"
                        >
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
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setModal({ type: "view", sale })}
                          aria-label="View sale details"
                        >
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setModal({ type: "edit", sale })}
                          aria-label="Edit sale"
                        >
                          Edit
                        </Button>
                        {sale.isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setModal({ type: "delete", sale })}
                            aria-label="Void sale"
                            className="text-[var(--color-destructive)] hover:text-[var(--color-destructive)]"
                          >
                            Void
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableWrapper>

        {meta && <Pagination page={page} totalPages={meta.totalPages} onPageChange={setPage} />}
      </div>

      {/* Modals */}
      <CreateSaleModal open={modal?.type === "create"} onClose={() => setModal(null)} />

      {modal?.type === "view" && (
        <ViewSaleModal sale={modal.sale} open onClose={() => setModal(null)} />
      )}

      {modal?.type === "edit" && (
        <EditSaleModal key={modal.sale.id} sale={modal.sale} open onClose={() => setModal(null)} />
      )}

      {modal?.type === "delete" && (
        <DeleteSaleModal sale={modal.sale} open onClose={() => setModal(null)} />
      )}

      {modal?.type === "receipt" && (
        <SaleReceiptModal
          key={modal.sale.id}
          sale={modal.sale}
          open
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
