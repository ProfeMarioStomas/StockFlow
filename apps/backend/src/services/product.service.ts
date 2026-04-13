import { HTTPException } from "hono/http-exception";
import type { Database } from "../db/client";
import { cache } from "../lib/cache";
import type { PaginatedResponse } from "../models/common.model";
import type {
  CreateProductInput,
  ProductResponse,
  UpdateProductInput,
  UploadImageResponse,
} from "../models/product.model";
import { createProductRepository } from "../repositories/product.repository";

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const TTL_5MIN = 5 * 60 * 1000;

export type ProductService = ReturnType<typeof createProductService>;

export function createProductService(db: Database) {
  const repo = createProductRepository(db);

  return {
    async listProducts(
      filters?: { isActive?: boolean },
      page = 1,
      pageSize = 20,
    ): Promise<PaginatedResponse<ProductResponse>> {
      const [records, total] = await Promise.all([
        repo.findPage(filters, { limit: pageSize, offset: (page - 1) * pageSize }),
        repo.count(filters),
      ]);
      return {
        data: records,
        meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      };
    },

    async listAllProducts(filters?: { isActive?: boolean }): Promise<ProductResponse[]> {
      const cached = cache.get<ProductResponse[]>("products:list");
      if (cached) return cached;

      const records = await repo.findAll(filters);
      cache.set("products:list", records, TTL_5MIN);
      return records;
    },

    async getProductById(id: string): Promise<ProductResponse> {
      const cached = cache.get<ProductResponse>(`products:${id}`);
      if (cached) return cached;

      const record = await repo.findById(id);
      if (!record) {
        throw new HTTPException(404, { message: "Product not found" });
      }

      cache.set(`products:${id}`, record, TTL_5MIN);
      return record;
    },

    async createProduct(input: CreateProductInput): Promise<ProductResponse> {
      const record = await repo.create({
        name: input.name,
        barcode: input.barcode,
        price: input.price,
        ...(input.costPrice !== undefined ? { costPrice: input.costPrice } : {}),
        ...(input.stock !== undefined ? { stock: input.stock } : {}),
        ...(input.criticalStock !== undefined ? { criticalStock: input.criticalStock } : {}),
        ...(input.imageKey !== undefined ? { imageKey: input.imageKey } : {}),
      });

      cache.invalidate("products:list");
      return record;
    },

    async updateProduct(id: string, input: UpdateProductInput): Promise<ProductResponse> {
      const existing = await repo.findById(id);
      if (!existing) {
        throw new HTTPException(404, { message: "Product not found" });
      }

      const updateData: Partial<{
        name: string;
        barcode: string;
        price: number;
        costPrice: number;
        criticalStock: number;
        isActive: boolean;
        imageKey: string | null;
      }> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.barcode !== undefined) updateData.barcode = input.barcode;
      if (input.price !== undefined) updateData.price = input.price;
      if (input.costPrice !== undefined) updateData.costPrice = input.costPrice;
      if (input.criticalStock !== undefined) updateData.criticalStock = input.criticalStock;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;
      if (input.imageKey !== undefined) updateData.imageKey = input.imageKey;

      const updated = await repo.update(id, updateData);
      if (!updated) {
        throw new HTTPException(404, { message: "Product not found" });
      }

      cache.invalidate(`products:${id}`);
      cache.invalidate("products:list");
      return updated;
    },

    async deleteProduct(id: string): Promise<void> {
      const existing = await repo.findById(id);
      if (!existing) {
        throw new HTTPException(404, { message: "Product not found" });
      }

      await repo.softDelete(id);
      cache.invalidate(`products:${id}`);
      cache.invalidate("products:list");
    },

    async uploadProductImage(
      bucket: R2Bucket,
      file: File,
      r2BaseUrl: string,
    ): Promise<UploadImageResponse> {
      const ext = ALLOWED_MIME_TYPES[file.type];
      if (!ext) {
        throw new HTTPException(400, {
          message: "Unsupported file type. Allowed: JPEG, PNG, WebP.",
        });
      }

      if (file.size > MAX_FILE_SIZE) {
        throw new HTTPException(413, { message: "File too large. Maximum size is 5 MB." });
      }

      const key = `products/${crypto.randomUUID()}${ext}`;
      await bucket.put(key, await file.arrayBuffer(), {
        httpMetadata: { contentType: file.type },
      });

      const baseUrl = r2BaseUrl.replace(/\/$/, "");
      return { key, url: `${baseUrl}/${key}` };
    },
  };
}
