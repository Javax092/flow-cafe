import "server-only";

import { appendAuditLog } from "@/server/audit/audit.service";
import { prisma } from "@/server/db/prisma";

export class CategoryRepository {
  async findAll(businessId: string) {
    return prisma.category.findMany({
      where: { businessId },
      include: { _count: { select: { products: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  async create(businessId: string, userId: string, name: string, sortOrder: number, printSector: string) {
    return prisma.$transaction(async (tx) => {
      const category = await tx.category.create({ data: { businessId, name, sortOrder, printSector } });
      await appendAuditLog({
        businessId, userId, action: "CATEGORY_CREATED", entity: "Category", entityId: category.id,
        after: { name, sortOrder, printSector, isActive: category.isActive },
      }, tx);
      return category;
    });
  }

  async setActive(businessId: string, userId: string, categoryId: string, isActive: boolean) {
    return this.updateWithAudit(businessId, userId, categoryId, "CATEGORY_STATUS_CHANGED", { isActive });
  }

  async setSortOrder(businessId: string, userId: string, categoryId: string, sortOrder: number) {
    return this.updateWithAudit(businessId, userId, categoryId, "CATEGORY_ORDER_CHANGED", { sortOrder });
  }

  async setPrintSector(businessId: string, userId: string, categoryId: string, printSector: string) {
    return this.updateWithAudit(businessId, userId, categoryId, "CATEGORY_SECTOR_CHANGED", { printSector });
  }

  private async updateWithAudit(
    businessId: string,
    userId: string,
    categoryId: string,
    action: string,
    data: { isActive?: boolean; sortOrder?: number; printSector?: string },
  ) {
    return prisma.$transaction(async (tx) => {
      const before = await tx.category.findFirstOrThrow({ where: { id: categoryId, businessId } });
      const category = await tx.category.update({ where: { id: before.id }, data });
      await appendAuditLog({
        businessId, userId, action, entity: "Category", entityId: category.id,
        before: { isActive: before.isActive, sortOrder: before.sortOrder, printSector: before.printSector },
        after: { isActive: category.isActive, sortOrder: category.sortOrder, printSector: category.printSector },
      }, tx);
      return category;
    });
  }
}
