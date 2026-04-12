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
      setServerError("Failed to delete the product. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Delete Product"
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} loading={isDeleting}>
            Delete
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-[var(--color-foreground)]">
          Are you sure you want to delete <span className="font-semibold">{product.name}</span>?
          This action cannot be undone.
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
