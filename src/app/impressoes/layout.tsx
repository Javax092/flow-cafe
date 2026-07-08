import { requireRoutePermission } from "@/server/rbac/permissions";

export default async function PrintsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireRoutePermission("VIEW_PRINT_QUEUE");
  return children;
}
