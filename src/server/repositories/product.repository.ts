import "server-only";

import type { ProductStatus } from "@prisma/client";

import { appendAuditLog } from "@/server/audit/audit.service";
import { prisma } from "@/server/db/prisma";

export class ProductRepository {
  async findAllByBusiness(businessId: string, search?: string) {
    return prisma.product.findMany({
      where: {
        businessId,
        ...(search ? { OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ] } : {}),
      },
      include: { category: { select: { id: true, name: true, isActive: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  async findSaleable(businessId: string, search?: string) {
    return prisma.product.findMany({
      where: {
        businessId,
        status: "ACTIVE",
        OR: [{ categoryId: null }, { category: { is: { isActive: true } } }],
        ...(search ? { AND: [{ OR: [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { category: { is: { name: { contains: search, mode: "insensitive" } } } },
        ] }] } : {}),
      },
      include: { category: { select: { id: true, name: true, sortOrder: true } } },
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
    });
  }

  async findById(businessId: string, productId: string) {
    return prisma.product.findFirst({ where: { id: productId, businessId } });
  }

  async create(businessId: string, userId: string, data: {
    name: string; price: number; categoryId?: string; description?: string; sortOrder: number;
  }) {
    return prisma.$transaction(async (tx) => {
      if (data.categoryId) {
        const category = await tx.category.findFirst({ where: { id: data.categoryId, businessId }, select: { id: true } });
        if (!category) throw new Error("Categoria inválida.");
      }
      const product = await tx.product.create({ data: { businessId, ...data } });
      await appendAuditLog({
        businessId, userId, action: "PRODUCT_CREATED", entity: "Product", entityId: product.id,
        after: { name: product.name, price: product.price.toString(), status: product.status, categoryId: product.categoryId, sortOrder: product.sortOrder },
      }, tx);
      return product;
    });
  }

  async setStatus(businessId: string, userId: string, productId: string, status: ProductStatus) {
    return this.updateWithAudit(businessId, userId, productId, "PRODUCT_STATUS_CHANGED", { status });
  }

  async setSortOrder(businessId: string, userId: string, productId: string, sortOrder: number) {
    return this.updateWithAudit(businessId, userId, productId, "PRODUCT_ORDER_CHANGED", { sortOrder });
  }

  private async updateWithAudit(
    businessId: string,
    userId: string,
    productId: string,
    action: string,
    data: { status?: ProductStatus; sortOrder?: number },
  ) {
    return prisma.$transaction(async (tx) => {
      const before = await tx.product.findFirstOrThrow({ where: { id: productId, businessId } });
      const product = await tx.product.update({ where: { id: before.id }, data });
      await appendAuditLog({
        businessId, userId, action, entity: "Product", entityId: product.id,
        before: { status: before.status, sortOrder: before.sortOrder },
        after: { status: product.status, sortOrder: product.sortOrder },
      }, tx);
      return product;
    });
  }
}
