import type {
  CreateInventoryReceiptFormValues,
  InventoryReceiptResponse,
  PaginatedInventoryReceiptsResponse,
  UpdateInventoryReceiptFormValues,
} from "../models/inventory-receipt.model";
import { api } from "./api";

export const inventoryReceiptService = {
  listReceipts: (page: number, pageSize: number, isActive?: boolean) =>
    api
      .get<PaginatedInventoryReceiptsResponse>("/inventory-receipts", {
        params: {
          page,
          pageSize,
          ...(isActive !== undefined && { isActive: String(isActive) }),
        },
      })
      .then((r) => r.data),

  getReceipt: (id: string) =>
    api.get<InventoryReceiptResponse>(`/inventory-receipts/${id}`).then((r) => r.data),

  createReceipt: (data: CreateInventoryReceiptFormValues) =>
    api.post<InventoryReceiptResponse>("/inventory-receipts", data).then((r) => r.data),

  updateReceipt: (id: string, data: UpdateInventoryReceiptFormValues) =>
    api.put<InventoryReceiptResponse>(`/inventory-receipts/${id}`, data).then((r) => r.data),

  deleteReceipt: (id: string) => api.delete<void>(`/inventory-receipts/${id}`),
};
