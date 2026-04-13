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
import { CreateReceiptModal } from "../components/features/inventory-receipts/CreateReceiptModal";
import { DeleteReceiptModal } from "../components/features/inventory-receipts/DeleteReceiptModal";
import { EditReceiptModal } from "../components/features/inventory-receipts/EditReceiptModal";
import { ViewReceiptModal } from "../components/features/inventory-receipts/ViewReceiptModal";
import type { InventoryReceiptResponse } from "../models/inventory-receipt.model";
import { inventoryReceiptService } from "../services/inventory-receipt.service";

type ModalState =
  | { type: "create" }
  | { type: "view"; receipt: InventoryReceiptResponse }
  | { type: "edit"; receipt: InventoryReceiptResponse }
  | { type: "delete"; receipt: InventoryReceiptResponse }
  | null;

const PAGE_SIZE = 20;

export function InventoryReceiptsPage() {
  const [page, setPage] = useState(1);
  const [showInactive, setShowInactive] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["inventory-receipts", { page, showInactive }],
    queryFn: () =>
      inventoryReceiptService.listReceipts(page, PAGE_SIZE, showInactive ? undefined : true),
  });

  if (isLoading) return <PageSpinner />;

  const receipts = data?.data ?? [];
  const meta = data?.meta;

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
              Comprobante Ingresos
            </h2>
            {meta && (
              <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
                {meta.total} {meta.total === 1 ? "comprobante" : "comprobantes"}
                {showInactive ? " (incluyendo anulados)" : ""}
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
              Mostrar anulados
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
              Nuevo comprobante
            </Button>
          </div>
        </div>

        {/* Table */}
        <TableWrapper>
          <Table>
            <TableHead>
              <tr>
                <TableHeader>Fecha</TableHeader>
                <TableHeader>Items</TableHeader>
                <TableHeader>Notas</TableHeader>
                <TableHeader>Estado</TableHeader>
                <TableHeader className="text-right">Acciones</TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {receipts.length === 0 ? (
                <TableEmpty colSpan={5} message="No se encontraron comprobantes." />
              ) : (
                receipts.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="text-[var(--color-muted-foreground)]">
                      {new Date(receipt.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{receipt.details.length}</TableCell>
                    <TableCell className="max-w-xs truncate text-[var(--color-muted-foreground)]">
                      {receipt.notes || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={receipt.isActive ? "success" : "destructive"}>
                        {receipt.isActive ? "Activo" : "Anulado"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setModal({ type: "view", receipt })}
                          aria-label="View receipt details"
                        >
                          Ver
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setModal({ type: "edit", receipt })}
                          aria-label="Edit receipt"
                        >
                          Editar
                        </Button>
                        {receipt.isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setModal({ type: "delete", receipt })}
                            aria-label="Void receipt"
                            className="text-[var(--color-destructive)] hover:text-[var(--color-destructive)]"
                          >
                            Anular
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
      <CreateReceiptModal open={modal?.type === "create"} onClose={() => setModal(null)} />

      {modal?.type === "view" && (
        <ViewReceiptModal receipt={modal.receipt} open onClose={() => setModal(null)} />
      )}

      {modal?.type === "edit" && (
        <EditReceiptModal
          key={modal.receipt.id}
          receipt={modal.receipt}
          open
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === "delete" && (
        <DeleteReceiptModal receipt={modal.receipt} open onClose={() => setModal(null)} />
      )}
    </>
  );
}
