import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DIRECT_URL or DATABASE_URL must be set before running the seed.",
  );
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const ownerEmail = process.env.SEED_OWNER_EMAIL ?? "owner@flowcafe.local";
const ownerPassword = process.env.SEED_OWNER_PASSWORD ?? "FlowCafe@123";
const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin123";
const waiterPassword = process.env.SEED_GARCOM_PASSWORD ?? "garcom123";

try {
  const [passwordHash, adminPasswordHash, waiterPasswordHash] = await Promise.all([
    bcrypt.hash(ownerPassword, 12),
    bcrypt.hash(adminPassword, 12),
    bcrypt.hash(waiterPassword, 12),
  ]);

  const result = await prisma.$transaction(async (tx) => {
    const business = await tx.business.upsert({
      where: { slug: "flow-cafe-local" },
      update: { name: "Flow Café Local", isActive: true },
      create: {
        name: "Flow Café Local",
        slug: "flow-cafe-local",
      },
    });

    const branch = await tx.branch.upsert({
      where: {
        businessId_code: { businessId: business.id, code: "MATRIZ" },
      },
      update: { name: "Matriz", isActive: true },
      create: {
        businessId: business.id,
        name: "Matriz",
        code: "MATRIZ",
      },
    });

    await tx.businessSettings.upsert({
      where: { businessId: business.id },
      update: {},
      create: { businessId: business.id },
    });

    const owner = await tx.user.upsert({
      where: {
        businessId_email: { businessId: business.id, email: ownerEmail },
      },
      update: {
        branchId: branch.id,
        name: "Proprietário Local",
        passwordHash,
        role: "OWNER",
        status: "ACTIVE",
      },
      create: {
        businessId: business.id,
        branchId: branch.id,
        name: "Proprietário Local",
        email: ownerEmail,
        passwordHash,
        role: "OWNER",
      },
    });

    const admin = await tx.user.upsert({
      where: { username: "admin" },
      update: {
        businessId: business.id,
        branchId: branch.id,
        name: "Administrador",
        email: "admin@flowcafe.local",
        passwordHash: adminPasswordHash,
        role: "ADMIN",
        status: "ACTIVE",
      },
      create: {
        businessId: business.id,
        branchId: branch.id,
        name: "Administrador",
        username: "admin",
        email: "admin@flowcafe.local",
        passwordHash: adminPasswordHash,
        role: "ADMIN",
      },
    });

    const waiter = await tx.user.upsert({
      where: { username: "garcom" },
      update: {
        businessId: business.id,
        branchId: branch.id,
        name: "Garçom",
        email: "garcom@flowcafe.local",
        passwordHash: waiterPasswordHash,
        role: "GARCOM",
        status: "ACTIVE",
      },
      create: {
        businessId: business.id,
        branchId: branch.id,
        name: "Garçom",
        username: "garcom",
        email: "garcom@flowcafe.local",
        passwordHash: waiterPasswordHash,
        role: "GARCOM",
      },
    });

    await tx.auditLog.create({
      data: {
        businessId: business.id,
        userId: owner.id,
        action: "SEED_APPLIED",
        entity: "Business",
        entityId: business.id,
        metadata: { branchId: branch.id },
      },
    });

    return { business, branch, owner, admin, waiter };
  });

  console.info(
    `Seed applied: business=${result.business.slug}, branch=${result.branch.code}, owner=${result.owner.email}, admin=${result.admin.username}, garcom=${result.waiter.username}`,
  );
} finally {
  await prisma.$disconnect();
}
