import "server-only";

import type { ProductStatus } from "@prisma/client";

import { requirePermission } from "@/server/rbac/permissions";
import { ProductRepository } from "@/server/repositories/product.repository";

const productRepository = new ProductRepository();

export class ProductService {
  async listProducts(search?: string) {
    const ctx = await requirePermission("VIEW_PRODUCTS");
    return productRepository.findAllByBusiness(ctx.businessId, search);
  }

  async listSaleableProducts(search?: string) {
    const ctx = await requirePermission("VIEW_PRODUCTS");
    return productRepository.findSaleable(ctx.businessId, search);
  }

  async createProduct(data: {
    name: string;
    price: number;
    categoryId?: string;
    description?: string;
    sortOrder: number;
  }) {
    const ctx = await requirePermission("MANAGE_PRODUCTS");
    return productRepository.create(ctx.businessId, ctx.userId, data);
  }

  async setProductStatus(productId: string, status: ProductStatus) {
    const ctx = await requirePermission("MANAGE_PRODUCTS");
    return productRepository.setStatus(ctx.businessId, ctx.userId, productId, status);
  }

  async setProductSortOrder(productId: string, sortOrder: number) {
    const ctx = await requirePermission("MANAGE_PRODUCTS");
    return productRepository.setSortOrder(ctx.businessId, ctx.userId, productId, sortOrder);
  }

  async getProductById(productId: string) {
    const ctx = await requirePermission("VIEW_PRODUCTS");
    return productRepository.findById(ctx.businessId, productId);
  }
}
