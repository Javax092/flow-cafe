import { requireRoutePermission } from "@/server/rbac/permissions";

export default async function PdvLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireRoutePermission("CREATE_SALE");
  return children;
}
