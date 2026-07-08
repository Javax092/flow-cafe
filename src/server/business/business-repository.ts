import { prisma } from "@/server/db/prisma";

export async function getCurrentBusiness(businessId: string) {
  return prisma.business.findFirst({
    where: {
      id: businessId,
      isActive: true,
    },
  });
}
