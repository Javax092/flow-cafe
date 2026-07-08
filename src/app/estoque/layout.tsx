import { requireRoutePermission } from "@/server/rbac/permissions";

export default async function InventoryLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireRoutePermission("VIEW_INVENTORY");
  return children;
}
