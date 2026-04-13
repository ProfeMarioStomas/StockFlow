import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useState } from "react";
import { PAYMENT_METHODS, paymentMethodLabels, updateSaleSchema } from "../../../models/sale.model";
import type { SaleResponse } from "../../../models/sale.model";
import { saleService } from "../../../services/sale.service";
import { Button } from "../../common/Button";
import { Label } from "../../common/Label";
import { Modal } from "../../common/Modal";

interface EditSaleModalProps {
  sale: SaleResponse;
  open: boolean;
  onClose: () => void;
}

type ServerError = {
  message: string;
  details?: { field: string; message: string }[];
};

export function EditSaleModal({ sale, open, onClose }: EditSaleModalProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<ServerError | null>(null);

  const form = useForm({
    defaultValues: {
      paymentMethod: sale.paymentMethod,
      isActive: sale.isActive,
    },
    validators: { onSubmit: updateSaleSchema },
    onSubmit: async ({ value }) => {
      setServerError(null);
      try {
        await saleService.updateSale(sale.id, value);
        await queryClient.invalidateQueries({ queryKey: ["sales"] });
        onClose();
      } catch (err) {
        const axiosError = err as AxiosError<{
          error: { message: string; details?: { field: string; message: string }[] };
        }>;
        const error = axiosError.response?.data?.error;
        setServerError({
          message: error?.message ?? "An unexpected error occurred.",
          details: error?.details?.length ? error.details : undefined,
        });
      }
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Sale"
      description="Update payment method or active status."
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <form.Subscribe selector={(s) => s.isSubmitting}>
            {(isSubmitting) => (
              <Button
                variant="primary"
                size="sm"
                type="submit"
                form="edit-sale-form"
                loading={isSubmitting}
              >
                Save Changes
              </Button>
            )}
          </form.Subscribe>
        </>
      }
    >
      <form
        id="edit-sale-form"
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

        <form.Field name="paymentMethod">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--color-foreground)]">
                Payment Method
              </label>
              <select
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value as "cash" | "card" | "transfer")}
                className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--color-input)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-foreground)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-1"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {paymentMethodLabels[m]}
                  </option>
                ))}
              </select>
              {field.state.meta.errors[0] && (
                <p className="text-xs text-[var(--color-error-text)]">
                  {field.state.meta.errors[0].message}
                </p>
              )}
            </div>
          )}
        </form.Field>

        <form.Field name="isActive">
          {(field) => (
            <div className="flex items-center gap-3">
              <input
                id={`edit-sale-active-${sale.id}`}
                type="checkbox"
                checked={field.state.value ?? true}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.checked)}
                className="h-4 w-4 cursor-pointer rounded border-[var(--color-input)] accent-[var(--color-accent)]"
              />
              <Label htmlFor={`edit-sale-active-${sale.id}`} className="cursor-pointer">
                Active sale
              </Label>
            </div>
          )}
        </form.Field>
      </form>
    </Modal>
  );
}
