import { requireRoutePermission } from "@/server/rbac/permissions";

export default async function CatalogLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireRoutePermission("MANAGE_PRODUCTS");
  return children;
}
