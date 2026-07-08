import { requireRoutePermission } from "@/server/rbac/permissions";

export default async function TablesLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireRoutePermission("MANAGE_TABS");
  return children;
}
