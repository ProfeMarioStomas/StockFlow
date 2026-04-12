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

const R2_BASE_URL = "https://pub-f0bcf28b115849ffbbb6ac15fb70a6c2.r2.dev";

type ServerError = {
  message: string;
  details?: { field: string; message: string }[];
};

export function EditProductModal({ product, open, onClose }: EditProductModalProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<ServerError | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImagePreview(null);
    }
  }

  const currentImageUrl = product.imageKey ? `${R2_BASE_URL}/${product.imageKey}` : null;

  const form = useForm({
    defaultValues: {
      name: product.name,
      barcode: product.barcode,
      price: product.price as unknown as number,
      costPrice: (product.costPrice ?? undefined) as number | undefined,
      criticalStock: (product.criticalStock ?? undefined) as number | undefined,
      isActive: product.isActive,
    },
    validators: { onSubmit: updateProductSchema },
    onSubmit: async ({ value }) => {
      setServerError(null);
      try {
        let imageKey: string | undefined;
        if (imageFile) {
          const uploaded = await productService.uploadImage(imageFile);
          imageKey = uploaded.key;
        }
        // TanStack Form passes raw form state (HTML inputs return strings).
        // Parse through the Zod schema to coerce numeric fields before sending to the API.
        const coerced = updateProductSchema.parse(value);
        await productService.updateProduct(product.id, { ...coerced, imageKey });
        await queryClient.invalidateQueries({ queryKey: ["products"] });
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
                value={(field.state.value ?? "") as unknown as string}
                onBlur={field.handleBlur}
                onChange={(e) =>
                  field.handleChange(
                    e.target.value === "" ? undefined : (e.target.value as unknown as number),
                  )
                }
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
              value={(field.state.value ?? "") as unknown as string}
              onBlur={field.handleBlur}
              onChange={(e) =>
                field.handleChange(
                  e.target.value === "" ? undefined : (e.target.value as unknown as number),
                )
              }
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

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--color-foreground)]">
            Product Image
          </label>
          {(imagePreview ?? currentImageUrl) && (
            <img
              src={imagePreview ?? currentImageUrl!}
              alt="Product"
              className="h-24 w-24 rounded-[var(--radius-md)] object-cover"
            />
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageChange}
            className="text-sm text-[var(--color-muted-foreground)] file:mr-3 file:cursor-pointer file:rounded-[var(--radius-sm)] file:border file:border-[var(--color-input)] file:bg-[var(--color-secondary)] file:px-3 file:py-1 file:text-sm file:font-medium file:text-[var(--color-foreground)] hover:file:bg-[var(--color-secondary-hover)]"
          />
        </div>
      </form>
    </Modal>
  );
}
