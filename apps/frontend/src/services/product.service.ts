import type {
  CreateProductFormValues,
  PaginatedProductsResponse,
  ProductResponse,
  UpdateProductFormValues,
} from "../models/product.model";
import { api } from "./api";

export const productService = {
  listProducts: (page: number, pageSize: number, isActive?: boolean) =>
    api
      .get<PaginatedProductsResponse>("/products", {
        params: {
          page,
          pageSize,
          ...(isActive !== undefined && { isActive: String(isActive) }),
        },
      })
      .then((r) => r.data),

  createProduct: (data: CreateProductFormValues) =>
    api.post<ProductResponse>("/products", data).then((r) => r.data),

  updateProduct: (id: string, data: UpdateProductFormValues) =>
    api.put<ProductResponse>(`/products/${id}`, data).then((r) => r.data),

  deleteProduct: (id: string) => api.delete<void>(`/products/${id}`),
};
