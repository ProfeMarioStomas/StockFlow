import type {
  CreateSaleFormValues,
  PaginatedSalesResponse,
  SaleResponse,
  UpdateSaleFormValues,
} from "../models/sale.model";
import { api } from "./api";

export const saleService = {
  listSales: (page: number, pageSize: number, isActive?: boolean) =>
    api
      .get<PaginatedSalesResponse>("/sales", {
        params: {
          page,
          pageSize,
          ...(isActive !== undefined && { isActive: String(isActive) }),
        },
      })
      .then((r) => r.data),

  getSale: (id: string) => api.get<SaleResponse>(`/sales/${id}`).then((r) => r.data),

  createSale: (data: CreateSaleFormValues) =>
    api.post<SaleResponse>("/sales", data).then((r) => r.data),

  updateSale: (id: string, data: UpdateSaleFormValues) =>
    api.put<SaleResponse>(`/sales/${id}`, data).then((r) => r.data),

  deleteSale: (id: string) => api.delete<void>(`/sales/${id}`),
};
