import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1, { error: "Nombre requerido" }).max(255),
  barcode: z.string().min(1, { error: "Código de barras requerido" }).max(100),
  price: z.coerce
    .number({ error: "Precio debe ser un número" })
    .positive({ error: "Precio debe ser mayor que 0" }),
  costPrice: z.coerce
    .number({ error: "Precio de costo debe ser un número" })
    .positive({ error: "Precio de costo debe ser mayor que 0" })
    .optional(),
  stock: z.coerce
    .number({ error: "Stock debe ser un número" })
    .int({ error: "Stock debe ser un número entero" })
    .nonnegative({ error: "Stock no puede ser negativo" })
    .optional(),
  criticalStock: z.coerce
    .number({ error: "Stock crítico debe ser un número" })
    .int({ error: "Stock crítico debe ser un número entero" })
    .nonnegative({ error: "Stock crítico no puede ser negativo" })
    .optional(),
});

export const updateProductSchema = z.object({
  name: z.string().min(1, { error: "Nombre requerido" }).max(255).optional(),
  barcode: z.string().min(1, { error: "Código de barras requerido" }).max(100).optional(),
  price: z.coerce
    .number({ error: "Precio debe ser un número" })
    .positive({ error: "Precio debe ser mayor que 0" })
    .optional(),
  costPrice: z.coerce
    .number({ error: "Precio de costo debe ser un número" })
    .positive({ error: "Precio de costo debe ser mayor que 0" })
    .optional(),
  criticalStock: z.coerce
    .number({ error: "Stock crítico debe ser un número" })
    .int({ error: "Stock crítico debe ser un número entero" })
    .nonnegative({ error: "Stock crítico no puede ser negativo" })
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
