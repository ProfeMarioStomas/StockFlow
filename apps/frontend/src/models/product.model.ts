import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1, { error: "Name is required" }).max(255),
  barcode: z.string().min(1, { error: "Barcode is required" }).max(100),
  price: z.coerce
    .number({ error: "Price must be a number" })
    .positive({ error: "Price must be greater than 0" }),
  costPrice: z.coerce
    .number({ error: "Cost price must be a number" })
    .positive({ error: "Cost price must be greater than 0" })
    .optional(),
  stock: z.coerce
    .number({ error: "Stock must be a number" })
    .int({ error: "Stock must be a whole number" })
    .nonnegative({ error: "Stock cannot be negative" })
    .optional(),
  criticalStock: z.coerce
    .number({ error: "Critical stock must be a number" })
    .int({ error: "Critical stock must be a whole number" })
    .nonnegative({ error: "Critical stock cannot be negative" })
    .optional(),
});

export const updateProductSchema = z.object({
  name: z.string().min(1, { error: "Name is required" }).max(255).optional(),
  barcode: z.string().min(1, { error: "Barcode is required" }).max(100).optional(),
  price: z.coerce
    .number({ error: "Price must be a number" })
    .positive({ error: "Price must be greater than 0" })
    .optional(),
  costPrice: z.coerce
    .number({ error: "Cost price must be a number" })
    .positive({ error: "Cost price must be greater than 0" })
    .optional(),
  criticalStock: z.coerce
    .number({ error: "Critical stock must be a number" })
    .int({ error: "Critical stock must be a whole number" })
    .nonnegative({ error: "Critical stock cannot be negative" })
    .optional(),
  isActive: z.boolean().optional(),
});

export type CreateProductFormValues = z.infer<typeof createProductSchema>;
export type UpdateProductFormValues = z.infer<typeof updateProductSchema>;

export type ProductResponse = {
  id: string;
  name: string;
  barcode: string;
  price: number;
  costPrice: number | null;
  stock: number;
  criticalStock: number | null;
  imageKey: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PaginatedProductsResponse = {
  data: ProductResponse[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};
