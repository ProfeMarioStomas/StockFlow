import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { SaleResponse } from "../../../models/sale.model";
import { saleService } from "../../../services/sale.service";
import { Button } from "../../common/Button";
import { Modal } from "../../common/Modal";

interface DeleteSaleModalProps {
  sale: SaleResponse;
  open: boolean;
  onClose: () => void;
}

const fmt = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" });

export function DeleteSaleModal({ sale, open, onClose }: DeleteSaleModalProps) {
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleVoid() {
    setIsDeleting(true);
    setServerError(null);
    try {
      await saleService.deleteSale(sale.id);
      await queryClient.invalidateQueries({ queryKey: ["sales"] });
      // Stock levels reverted
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      onClose();
    } catch {
      setServerError("Error al anular la venta. Por favor, inténtelo de nuevo.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Anular venta"
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button variant="destructive" size="sm" onClick={handleVoid} loading={isDeleting}>
            Anular
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-[var(--color-foreground)]">
          ¿Está seguro de que desea anular la venta por{" "}
          <span className="font-semibold">{fmt.format(sale.totalAmount)}</span>? Stock se revertirá
          para todos los{" "}
          <span className="font-medium">
            {sale.details.length} {sale.details.length === 1 ? "item" : "items"}
          </span>
          . Esta acción no se puede deshacer.
        </p>

        {serverError && (
          <div
            role="alert"
            className="rounded-[var(--radius-md)] border border-[var(--color-destructive)]/30 bg-[var(--color-error-bg)] px-3 py-2 text-sm text-[var(--color-error-text)]"
          >
            {serverError}
          </div>
        )}
      </div>
    </Modal>
  );
}
