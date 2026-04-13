import { z } from "zod";

export const createReceiptItemSchema = z.object({
  productId: z.string().min(1, { error: "Product is required" }),
  quantity: z.coerce
    .number({ error: "Quantity must be a number" })
    .int({ error: "Quantity must be a whole number" })
    .positive({ error: "Quantity must be greater than 0" }),
});

export const createInventoryReceiptSchema = z.object({
  notes: z.string().optional(),
  items: z.array(createReceiptItemSchema).min(1, { error: "At least one item is required" }),
});

export const updateInventoryReceiptSchema = z.object({
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type CreateReceiptItemFormValues = z.infer<typeof createReceiptItemSchema>;
export type CreateInventoryReceiptFormValues = z.infer<typeof createInventoryReceiptSchema>;
export type UpdateInventoryReceiptFormValues = z.infer<typeof updateInventoryReceiptSchema>;

export type ReceiptDetailResponse = {
  id: string;
  receiptId: string;
  productId: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
};

export type InventoryReceiptResponse = {
  id: string;
  notes: string | null;
  receivedById: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  details: ReceiptDetailResponse[];
};

export type PaginatedInventoryReceiptsResponse = {
  data: InventoryReceiptResponse[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};
