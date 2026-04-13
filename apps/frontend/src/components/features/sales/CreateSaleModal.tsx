import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useState } from "react";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import { PAYMENT_METHODS, createSaleSchema, paymentMethodLabels } from "../../../models/sale.model";
import { productService } from "../../../services/product.service";
import { saleService } from "../../../services/sale.service";
import { Button } from "../../common/Button";
import { Modal } from "../../common/Modal";

interface CreateSaleModalProps {
  open: boolean;
  onClose: () => void;
}

type ServerError = {
  message: string;
  details?: { field: string; message: string }[];
};

const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function CreateSaleModal({ open, onClose }: CreateSaleModalProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<ServerError | null>(null);

  const { data: currentUser } = useCurrentUser();
  const isAdmin = currentUser?.role === "admin";

  const { data: products = [] } = useQuery({
    queryKey: ["products", "all"],
    queryFn: () => productService.listAll(true),
    staleTime: 60_000,
    enabled: open,
  });

  const form = useForm({
    defaultValues: {
      paymentMethod: "cash" as "cash" | "card" | "transfer",
      items: [
        {
          productId: "",
          quantity: "" as unknown as number,
          unitPrice: "" as unknown as number,
        },
      ],
    },
    validators: { onSubmit: createSaleSchema },
    onSubmit: async ({ value }) => {
      setServerError(null);
      try {
        const coerced = createSaleSchema.parse(value);
        await saleService.createSale(coerced);
        await queryClient.invalidateQueries({ queryKey: ["sales"] });
        // Stock levels changed
        await queryClient.invalidateQueries({ queryKey: ["products"] });
        handleClose();
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

  function handleClose() {
    form.reset();
    setServerError(null);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="New Sale"
      description="Register a new sale and deduct stock."
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <form.Subscribe selector={(s) => s.isSubmitting}>
            {(isSubmitting) => (
              <Button
                variant="primary"
                size="sm"
                type="submit"
                form="create-sale-form"
                loading={isSubmitting}
              >
                Create Sale
              </Button>
            )}
          </form.Subscribe>
        </>
      }
    >
      <form
        id="create-sale-form"
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

        {/* Payment method */}
        <form.Field name="paymentMethod">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--color-foreground)]">
                Payment Method
                <span className="ml-1 text-[var(--color-destructive)]" aria-hidden="true">
                  *
                </span>
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
                    {/* Product */}
                    <form.Field name={`items[${i}].productId`}>
                      {(subField) => (
                        <div className="flex flex-1 flex-col gap-1.5">
                          {i === 0 && (
                            <label className="text-sm font-medium text-[var(--color-foreground)]">
                              Product
                            </label>
                          )}
                          <select
                            value={subField.state.value ?? ""}
                            onBlur={subField.handleBlur}
                            onChange={(e) => {
                              subField.handleChange(e.target.value);
                              // Auto-fill unit price with the product's listed sale price
                              const product = products.find((p) => p.id === e.target.value);
                              if (product) {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                (form as any).setFieldValue(`items[${i}].unitPrice`, product.price);
                              }
                            }}
                            className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--color-input)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-foreground)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-1"
                          >
                            <option value="">Select product...</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} — stock: {p.stock}
                              </option>
                            ))}
                          </select>
                          {subField.state.meta.errors[0] && (
                            <p className="text-xs text-[var(--color-error-text)]">
                              {subField.state.meta.errors[0].message}
                            </p>
                          )}
                        </div>
                      )}
                    </form.Field>

                    {/* Quantity */}
                    <form.Field name={`items[${i}].quantity`}>
                      {(subField) => (
                        <div className="flex w-20 shrink-0 flex-col gap-1.5">
                          {i === 0 && (
                            <label className="text-sm font-medium text-[var(--color-foreground)]">
                              Qty
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

                    {/* Unit Price */}
                    <form.Field name={`items[${i}].unitPrice`}>
                      {(subField) => (
                        <div className="flex w-28 shrink-0 flex-col gap-1.5">
                          {i === 0 && (
                            <label className="text-sm font-medium text-[var(--color-foreground)]">
                              Unit Price
                            </label>
                          )}
                          <input
                            type="number"
                            min={0.01}
                            step={0.01}
                            placeholder="0.00"
                            readOnly={!isAdmin}
                            value={(subField.state.value ?? "") as unknown as string}
                            onBlur={subField.handleBlur}
                            onChange={(e) =>
                              subField.handleChange(
                                e.target.value === ""
                                  ? ("" as unknown as number)
                                  : (e.target.value as unknown as number),
                              )
                            }
                            className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--color-input)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-foreground)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-1 read-only:cursor-not-allowed read-only:opacity-60"
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

                {/* Array-level validation error */}
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
                    field.pushValue({
                      productId: "",
                      quantity: "" as unknown as number,
                      unitPrice: "" as unknown as number,
                    })
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
                  Add Item
                </Button>
              </div>
            )}
          </form.Field>
        </div>

        {/* Running total */}
        <form.Subscribe selector={(s) => s.values.items}>
          {(items) => {
            const total = items.reduce((sum, item) => {
              const qty = parseFloat(String(item.quantity)) || 0;
              const price = parseFloat(String(item.unitPrice)) || 0;
              return sum + qty * price;
            }, 0);
            if (total <= 0) return null;
            return (
              <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] pt-3">
                <span className="text-sm text-[var(--color-muted-foreground)]">Total</span>
                <span className="text-base font-semibold text-[var(--color-foreground)]">
                  {fmt.format(total)}
                </span>
              </div>
            );
          }}
        </form.Subscribe>
      </form>
    </Modal>
  );
}
