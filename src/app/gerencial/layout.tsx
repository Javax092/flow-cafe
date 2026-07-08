import { requireRoutePermission } from "@/server/rbac/permissions";

export default async function ManagementLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireRoutePermission("VIEW_REPORTS");
  return children;
}
