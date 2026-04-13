import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useState } from "react";
import type { InventoryReceiptResponse } from "../../../models/inventory-receipt.model";
import { updateInventoryReceiptSchema } from "../../../models/inventory-receipt.model";
import { inventoryReceiptService } from "../../../services/inventory-receipt.service";
import { Button } from "../../common/Button";
import { Input } from "../../common/Input";
import { Label } from "../../common/Label";
import { Modal } from "../../common/Modal";

interface EditReceiptModalProps {
  receipt: InventoryReceiptResponse;
  open: boolean;
  onClose: () => void;
}

type ServerError = {
  message: string;
  details?: { field: string; message: string }[] | undefined;
};

export function EditReceiptModal({ receipt, open, onClose }: EditReceiptModalProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<ServerError | null>(null);

  const form = useForm({
    defaultValues: {
      notes: receipt.notes ?? "",
      isActive: receipt.isActive,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: updateInventoryReceiptSchema as any },
    onSubmit: async ({ value }) => {
      setServerError(null);
      try {
        await inventoryReceiptService.updateReceipt(receipt.id, {
          notes: value.notes?.trim() || undefined,
          isActive: value.isActive,
        });
        await queryClient.invalidateQueries({ queryKey: ["inventory-receipts"] });
        onClose();
      } catch (err) {
        const axiosError = err as AxiosError<{
          error: { message: string; details?: { field: string; message: string }[] };
        }>;
        const error = axiosError.response?.data?.error;
        setServerError({
          message: error?.message ?? "Error desconocido.",
          details: error?.details?.length ? error.details : undefined,
        });
      }
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar Recibo"
      description="Actualice las notas o el estado activo."
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <form.Subscribe selector={(s) => s.isSubmitting}>
            {(isSubmitting) => (
              <Button
                variant="primary"
                size="sm"
                type="submit"
                form="edit-receipt-form"
                loading={isSubmitting}
              >
                Guardar Cambios
              </Button>
            )}
          </form.Subscribe>
        </>
      }
    >
      <form
        id="edit-receipt-form"
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        noValidate
        className="flex flex-col gap-4"
      >
        {serverError && (
          <div
            role="alert"
            className="rounded-[var(--radius-md)] border border-[var(--color-destructive)]/30 bg-[var(--color-error-bg)] px-3 py-2 text-sm text-[var(--color-error-text)]"
          >
            <p>{serverError.message}</p>
            {serverError.details && (
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                {serverError.details.map((d, i) => (
                  <li key={i}>
                    <span className="font-medium">{d.field}</span>: {d.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <form.Field name="notes">
          {(field) => (
            <Input
              label="Notas"
              placeholder="Opcional"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              error={field.state.meta.errors[0]?.message}
            />
          )}
        </form.Field>

        <form.Field name="isActive">
          {(field) => (
            <div className="flex items-center gap-3">
              <input
                id={`edit-receipt-active-${receipt.id}`}
                type="checkbox"
                checked={field.state.value ?? true}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.checked)}
                className="h-4 w-4 cursor-pointer rounded border-[var(--color-input)] accent-[var(--color-accent)]"
              />
              <Label htmlFor={`edit-receipt-active-${receipt.id}`} className="cursor-pointer">
                Activar Recibo
              </Label>
            </div>
          )}
        </form.Field>
      </form>
    </Modal>
  );
}
