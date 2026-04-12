import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useState } from "react";
import type { ProductResponse } from "../../../models/product.model";
import { updateProductSchema } from "../../../models/product.model";
import { productService } from "../../../services/product.service";
import { Button } from "../../common/Button";
import { Input } from "../../common/Input";
import { Label } from "../../common/Label";
import { Modal } from "../../common/Modal";

interface EditProductModalProps {
  product: ProductResponse;
  open: boolean;
  onClose: () => void;
}

export function EditProductModal({ product, open, onClose }: EditProductModalProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      name: product.name,
      barcode: product.barcode,
      price: product.price as unknown as number,
      costPrice: (product.costPrice ?? "") as unknown as number | undefined,
      criticalStock: (product.criticalStock ?? "") as unknown as number | undefined,
      isActive: product.isActive,
    },
    validators: { onSubmit: updateProductSchema },
    onSubmit: async ({ value }) => {
      setServerError(null);
      try {
        await productService.updateProduct(product.id, value);
        await queryClient.invalidateQueries({ queryKey: ["products"] });
        onClose();
      } catch (err) {
        const axiosError = err as AxiosError<{ error: { message: string } }>;
        setServerError(
          axiosError.response?.data?.error?.message ?? "An unexpected error occurred.",
        );
      }
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Product"
      description={`Editing ${product.name}`}
      size="md"
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
                form="edit-product-form"
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
        id="edit-product-form"
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
            {serverError}
          </div>
        )}

        <form.Field name="name">
          {(field) => (
            <Input
              label="Name"
              required
              value={field.state.value ?? ""}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              error={field.state.meta.errors[0]?.message}
            />
          )}
        </form.Field>

        <form.Field name="barcode">
          {(field) => (
            <Input
              label="Barcode"
              required
              value={field.state.value ?? ""}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              error={field.state.meta.errors[0]?.message}
            />
          )}
        </form.Field>

        <div className="grid grid-cols-2 gap-4">
          <form.Field name="price">
            {(field) => (
              <Input
                label="Sale Price"
                type="number"
                required
                min={0}
                step={0.01}
                value={field.state.value as unknown as string}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value as unknown as number)}
                error={field.state.meta.errors[0]?.message}
              />
            )}
          </form.Field>

          <form.Field name="costPrice">
            {(field) => (
              <Input
                label="Cost Price"
                type="number"
                placeholder="0.00"
                min={0}
                step={0.01}
                value={field.state.value as unknown as string}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value as unknown as number)}
                error={field.state.meta.errors[0]?.message}
              />
            )}
          </form.Field>
        </div>

        <form.Field name="criticalStock">
          {(field) => (
            <Input
              label="Critical Stock"
              type="number"
              placeholder="0"
              min={0}
              step={1}
              helperText="Alert threshold. Stock is managed through Inventory Receipts."
              value={field.state.value as unknown as string}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value as unknown as number)}
              error={field.state.meta.errors[0]?.message}
            />
          )}
        </form.Field>

        <form.Field name="isActive">
          {(field) => (
            <div className="flex items-center gap-3">
              <input
                id={`edit-product-active-${product.id}`}
                type="checkbox"
                checked={field.state.value ?? true}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.checked)}
                className="h-4 w-4 cursor-pointer rounded border-[var(--color-input)] accent-[var(--color-accent)]"
              />
              <Label htmlFor={`edit-product-active-${product.id}`} className="cursor-pointer">
                Active product
              </Label>
            </div>
          )}
        </form.Field>
      </form>
    </Modal>
  );
}
