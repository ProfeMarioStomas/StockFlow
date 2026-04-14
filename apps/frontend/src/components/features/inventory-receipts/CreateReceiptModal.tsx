import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useState } from "react";
import { createInventoryReceiptSchema } from "../../../models/inventory-receipt.model";
import { inventoryReceiptService } from "../../../services/inventory-receipt.service";
import { productService } from "../../../services/product.service";
import { Button } from "../../common/Button";
import { Input } from "../../common/Input";
import { Modal } from "../../common/Modal";
import { ProductCombobox } from "../../common/ProductCombobox";

interface CreateReceiptModalProps {
  open: boolean;
  onClose: () => void;
}

type ServerError = {
  message: string;
  details?: { field: string; message: string }[] | undefined;
};

export function CreateReceiptModal({ open, onClose }: CreateReceiptModalProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<ServerError | null>(null);

  const { data: products = [] } = useQuery({
    queryKey: ["products", "all"],
    queryFn: () => productService.listAll(true),
    staleTime: 60_000,
    enabled: open,
  });

  const form = useForm({
    defaultValues: {
      notes: "",
      items: [{ productId: "", quantity: "" as unknown as number }],
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: createInventoryReceiptSchema as any },
    onSubmit: async ({ value }) => {
      setServerError(null);
      try {
        // Coerce numeric fields; also normalize empty notes to undefined
        const coerced = createInventoryReceiptSchema.parse(value);
        const payload = {
          ...coerced,
          notes: coerced.notes?.trim() || undefined,
        };
        await inventoryReceiptService.createReceipt(payload);
        await queryClient.invalidateQueries({ queryKey: ["inventory-receipts"] });
        // Stock levels changed — invalidate products cache too
        await queryClient.invalidateQueries({ queryKey: ["products"] });
        handleClose();
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

  function handleClose() {
    form.reset();
    setServerError(null);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Nuevo recibo de inventario"
      description="Registrar stock entrante para uno o más productos."
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" type="button" onClick={handleClose}>
            Cancelar
          </Button>
          <form.Subscribe selector={(s) => s.isSubmitting}>
            {(isSubmitting) => (
              <Button
                variant="primary"
                size="sm"
                type="submit"
                form="create-receipt-form"
                loading={isSubmitting}
              >
                Crear Recibo
              </Button>
            )}
          </form.Subscribe>
        </>
      }
    >
      <form
        id="create-receipt-form"
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
              placeholder="Opcional — e.g. Batch A, supplier XYZ"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              error={field.state.meta.errors[0]?.message}
            />
          )}
        </form.Field>

        {/* Items */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-[var(--color-foreground)]">
            Items
            <span className="ml-1 text-[var(--color-destructive)]" aria-hidden="true">
              *
            </span>
          </p>

          <form.Field name="items" mode="array">
            {(field) => (
              <div className="flex flex-col gap-2">
                {field.state.value.map((_, i) => (
                  <div key={i} className="flex items-end gap-2">
                    {/* Product combobox */}
                    <form.Field name={`items[${i}].productId`}>
                      {(subField) => (
                        <div className="flex-1">
                          <ProductCombobox
                            products={products}
                            value={subField.state.value ?? ""}
                            onChange={subField.handleChange}
                            onBlur={subField.handleBlur}
                            label={i === 0 ? "Producto" : undefined}
                            error={subField.state.meta.errors[0]?.message}
                          />
                        </div>
                      )}
                    </form.Field>

                    {/* Quantity */}
                    <form.Field name={`items[${i}].quantity`}>
                      {(subField) => (
                        <div className="flex w-28 shrink-0 flex-col gap-1.5">
                          {i === 0 && (
                            <label className="text-sm font-medium text-[var(--color-foreground)]">
                              Ctn.
                            </label>
                          )}
                          <input
                            type="number"
                            min={1}
                            step={1}
                            placeholder="1"
                            value={(subField.state.value ?? "") as unknown as string}
                            onBlur={subField.handleBlur}
                            onChange={(e) =>
                              subField.handleChange(e.target.value as unknown as number)
                            }
                            className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--color-input)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-foreground)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-1"
                          />
                          {subField.state.meta.errors[0] && (
                            <p className="text-xs text-[var(--color-error-text)]">
                              {subField.state.meta.errors[0].message}
                            </p>
                          )}
                        </div>
                      )}
                    </form.Field>

                    {/* Remove row */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => field.removeValue(i)}
                      disabled={field.state.value.length === 1}
                      aria-label="Remove item"
                      className="shrink-0 text-[var(--color-muted-foreground)] hover:text-[var(--color-destructive)]"
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
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </Button>
                  </div>
                ))}

                {/* Array-level error (e.g. "At least one item is required") */}
                {field.state.meta.errors[0] && (
                  <p className="text-xs text-[var(--color-error-text)]">
                    {field.state.meta.errors[0].message}
                  </p>
                )}

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    field.pushValue({ productId: "", quantity: "" as unknown as number })
                  }
                  className="self-start"
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
                    <path d="M5 12h14" />
                    <path d="M12 5v14" />
                  </svg>
                  Agregar item
                </Button>
              </div>
            )}
          </form.Field>
        </div>
      </form>
    </Modal>
  );
}
