import { z } from "zod";

export const PAYMENT_METHODS = ["cash", "card", "transfer"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  transfer: "Transfer",
};

export const createSaleItemSchema = z.object({
  productId: z.string().min(1, { error: "Product is required" }),
  quantity: z.coerce
    .number({ error: "Quantity must be a number" })
    .int({ error: "Quantity must be a whole number" })
    .positive({ error: "Quantity must be greater than 0" }),
  unitPrice: z.coerce
    .number({ error: "Unit price must be a number" })
    .positive({ error: "Unit price must be greater than 0" }),
});

export const createSaleSchema = z.object({
  paymentMethod: z.enum(PAYMENT_METHODS, { error: "Payment method is required" }),
  items: z.array(createSaleItemSchema).min(1, { error: "At least one item is required" }),
});

export const updateSaleSchema = z.object({
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  isActive: z.boolean().optional(),
});

export type CreateSaleItemFormValues = z.infer<typeof createSaleItemSchema>;
export type CreateSaleFormValues = z.infer<typeof createSaleSchema>;
export type UpdateSaleFormValues = z.infer<typeof updateSaleSchema>;

export type SaleDetailResponse = {
  id: string;
  saleId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  createdAt: string;
  updatedAt: string;
};

export type SaleResponse = {
  id: string;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  sellerId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  details: SaleDetailResponse[];
};

export type PaginatedSalesResponse = {
  data: SaleResponse[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};
