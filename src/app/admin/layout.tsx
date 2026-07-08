import { requireRoutePermission } from "@/server/rbac/permissions";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireRoutePermission("VIEW_REPORTS");
  return children;
}
