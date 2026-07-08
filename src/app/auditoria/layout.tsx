import { requireRoutePermission } from "@/server/rbac/permissions";

export default async function AuditLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireRoutePermission("VIEW_AUDIT_LOGS");
  return children;
}
