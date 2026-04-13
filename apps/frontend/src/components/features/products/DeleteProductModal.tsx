import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { ProductResponse } from "../../../models/product.model";
import { productService } from "../../../services/product.service";
import { Button } from "../../common/Button";
import { Modal } from "../../common/Modal";

interface DeleteProductModalProps {
  product: ProductResponse;
  open: boolean;
  onClose: () => void;
}

export function DeleteProductModal({ product, open, onClose }: DeleteProductModalProps) {
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleDelete() {
    setIsDeleting(true);
    setServerError(null);
    try {
      await productService.deleteProduct(product.id);
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      onClose();
    } catch {
      setServerError("No fue posible eliminar el producto. Por favor inténtelo de nuevo.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Eliminar producto"
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} loading={isDeleting}>
            Eliminar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-[var(--color-foreground)]">
          ¿Estás seguro de que quieres eliminar <span className="font-semibold">{product.name}</span>?
          Esta acción no se puede deshacer.
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
