import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1, { error: "Name is required" }).max(255),
  price: z.coerce
    .number({ error: "Price must be a number" })
    .positive({ error: "Price must be greater than 0" }),
  stock: z.coerce
    .number({ error: "Stock must be a number" })
    .int({ error: "Stock must be a whole number" })
    .nonnegative({ error: "Stock cannot be negative" })
    .optional(),
});

export const updateProductSchema = z.object({
  name: z.string().min(1, { error: "Name is required" }).max(255).optional(),
  price: z.coerce
    .number({ error: "Price must be a number" })
    .positive({ error: "Price must be greater than 0" })
    .optional(),
  isActive: z.boolean().optional(),
});

export type CreateProductFormValues = z.infer<typeof createProductSchema>;
export type UpdateProductFormValues = z.infer<typeof updateProductSchema>;

export type ProductResponse = {
  id: string;
  name: string;
  price: number;
  stock: number;
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
