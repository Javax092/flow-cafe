import { requireRoutePermission } from "@/server/rbac/permissions";

export default async function WaiterLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireRoutePermission("MANAGE_TABS");
  return children;
}
