import { requireRoutePermission } from "@/server/rbac/permissions";

export default async function CashLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireRoutePermission("VIEW_CASH");
  return children;
}
