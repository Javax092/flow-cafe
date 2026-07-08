import { requireRoutePermission } from "@/server/rbac/permissions";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireRoutePermission("MANAGE_CRITICAL_SETTINGS");
  return children;
}
