import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { InventoryReceiptResponse } from "../../../models/inventory-receipt.model";
import { inventoryReceiptService } from "../../../services/inventory-receipt.service";
import { Button } from "../../common/Button";
import { Modal } from "../../common/Modal";

interface DeleteReceiptModalProps {
  receipt: InventoryReceiptResponse;
  open: boolean;
  onClose: () => void;
}

export function DeleteReceiptModal({ receipt, open, onClose }: DeleteReceiptModalProps) {
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleVoid() {
    setIsDeleting(true);
    setServerError(null);
    try {
      await inventoryReceiptService.deleteReceipt(receipt.id);
      await queryClient.invalidateQueries({ queryKey: ["inventory-receipts"] });
      // Stock levels reverted — invalidate products cache too
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      onClose();
    } catch {
      setServerError("Failed to void the receipt. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  const itemCount = receipt.details.length;
  const totalUnits = receipt.details.reduce((sum, d) => sum + d.quantity, 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Void Receipt"
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={handleVoid} loading={isDeleting}>
            Void Receipt
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-[var(--color-foreground)]">
          Are you sure you want to void this receipt?{" "}
          <span className="font-medium">
            {totalUnits} {totalUnits === 1 ? "unit" : "units"} across {itemCount}{" "}
            {itemCount === 1 ? "product" : "products"}
          </span>{" "}
          will be deducted from stock. This action cannot be undone.
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
