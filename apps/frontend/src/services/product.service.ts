import type {
  CreateProductFormValues,
  PaginatedProductsResponse,
  ProductResponse,
  UpdateProductFormValues,
} from "../models/product.model";
import { api } from "./api";

export const productService = {
  listAll: (isActive?: boolean) =>
    api
      .get<ProductResponse[]>("/products/all", {
        params: isActive !== undefined ? { isActive: String(isActive) } : undefined,
      })
      .then((r) => r.data),

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

  createProduct: (data: CreateProductFormValues & { imageKey?: string }) =>
    api.post<ProductResponse>("/products", data).then((r) => r.data),

  updateProduct: (id: string, data: UpdateProductFormValues & { imageKey?: string }) =>
    api.put<ProductResponse>(`/products/${id}`, data).then((r) => r.data),

  deleteProduct: (id: string) => api.delete<void>(`/products/${id}`),

  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post<{ key: string; url: string }>("/products/images", formData).then((r) => r.data);
  },
};
