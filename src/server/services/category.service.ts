import "server-only";

import { requirePermission } from "@/server/rbac/permissions";
import { CategoryRepository } from "@/server/repositories/category.repository";

const categoryRepository = new CategoryRepository();

export class CategoryService {
  async listCategories() {
    const ctx = await requirePermission("VIEW_PRODUCTS");
    return categoryRepository.findAll(ctx.businessId);
  }

  async createCategory(name: string, sortOrder: number, printSector: string) {
    const ctx = await requirePermission("MANAGE_PRODUCTS");
    return categoryRepository.create(ctx.businessId, ctx.userId, name, sortOrder, printSector);
  }

  async setCategoryActive(categoryId: string, isActive: boolean) {
    const ctx = await requirePermission("MANAGE_PRODUCTS");
    return categoryRepository.setActive(ctx.businessId, ctx.userId, categoryId, isActive);
  }

  async setCategorySortOrder(categoryId: string, sortOrder: number) {
    const ctx = await requirePermission("MANAGE_PRODUCTS");
    return categoryRepository.setSortOrder(ctx.businessId, ctx.userId, categoryId, sortOrder);
  }

  async setCategoryPrintSector(categoryId: string, printSector: string) {
    const ctx = await requirePermission("MANAGE_PRODUCTS");
    return categoryRepository.setPrintSector(ctx.businessId, ctx.userId, categoryId, printSector);
  }
}
