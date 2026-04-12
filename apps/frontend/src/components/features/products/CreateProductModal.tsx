import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useState } from "react";
import { createProductSchema } from "../../../models/product.model";
import { productService } from "../../../services/product.service";
import { Button } from "../../common/Button";
import { Input } from "../../common/Input";
import { Modal } from "../../common/Modal";

interface CreateProductModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateProductModal({ open, onClose }: CreateProductModalProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      name: "",
      price: "" as unknown as number,
      stock: "" as unknown as number | undefined,
    },
    validators: { onSubmit: createProductSchema },
    onSubmit: async ({ value }) => {
      setServerError(null);
      try {
        await productService.createProduct(value);
        await queryClient.invalidateQueries({ queryKey: ["products"] });
        handleClose();
      } catch (err) {
        const axiosError = err as AxiosError<{ error: { message: string } }>;
        setServerError(
          axiosError.response?.data?.error?.message ?? "An unexpected error occurred.",
        );
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
      title="Add Product"
      description="Create a new product in the catalog."
      size="md"
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
                form="create-product-form"
                loading={isSubmitting}
              >
                Create Product
              </Button>
            )}
          </form.Subscribe>
        </>
      }
    >
      <form
        id="create-product-form"
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
              placeholder="e.g. Widget Pro"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              error={field.state.meta.errors[0]?.message}
            />
          )}
        </form.Field>

        <form.Field name="price">
          {(field) => (
            <Input
              label="Price"
              type="number"
              required
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

        <form.Field name="stock">
          {(field) => (
            <Input
              label="Initial Stock"
              type="number"
              placeholder="0"
              min={0}
              step={1}
              helperText="Optional — defaults to 0 if left empty."
              value={field.state.value as unknown as string}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value as unknown as number)}
              error={field.state.meta.errors[0]?.message}
            />
          )}
        </form.Field>
      </form>
    </Modal>
  );
}
