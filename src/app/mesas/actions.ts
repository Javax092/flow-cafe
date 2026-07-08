"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { guardAuthenticatedAction } from "@/server/security/actions";
import { idSchema, optionalTextSchema } from "@/server/security/validation";
import { TabService } from "@/server/services/tab.service";

const service = new TabService();

export async function createTableAction(formData: FormData) {
  const tableNumber = z.coerce.number().int().min(1).max(10_000).parse(formData.get("tableNumber"));
  const name = `Mesa ${tableNumber}`;
  const sortOrder = tableNumber;
  await guardAuthenticatedAction({ action: "table:create", duplicateKey: `${name}:${sortOrder}` });
  await service.createTable(name, sortOrder);
  revalidatePath("/mesas");
}

export async function openTabAction(tableId: string, formData: FormData) {
  const parsedTableId = idSchema.parse(tableId);
  const customerName = optionalTextSchema(80).parse(formData.get("customerName"));
  await guardAuthenticatedAction({ action: "tab:open", duplicateKey: `${parsedTableId}:${customerName ?? ""}` });
  await service.openTab(parsedTableId, customerName);
  revalidatePath("/mesas");
}

export async function addOrderAction(tabId: string, formData: FormData) {
  const parsedTabId = idSchema.parse(tabId);
  const order = {
    productId: idSchema.parse(formData.get("productId")),
    quantity: z.coerce.number().int().min(1).max(99).parse(formData.get("quantity")),
    observation: optionalTextSchema(200).parse(formData.get("observation")),
  };
  await guardAuthenticatedAction({
    action: "tab:order",
    rateLimit: { limit: 40, windowMs: 60_000 },
    duplicateKey: `${parsedTabId}:${order.productId}:${order.quantity}:${order.observation ?? ""}`,
    duplicateTtlMs: 6_000,
  });
  await service.addOrder(parsedTabId, order);
  revalidatePath("/mesas");
}

export async function transferTabAction(tabId: string, formData: FormData) {
  const parsedTabId = idSchema.parse(tabId);
  const destinationTableId = idSchema.parse(formData.get("destinationTableId"));
  await guardAuthenticatedAction({ action: "tab:transfer", duplicateKey: `${parsedTabId}:${destinationTableId}` });
  await service.transferTab(parsedTabId, destinationTableId);
  revalidatePath("/mesas");
}

export async function closeTabAction(tabId: string) {
  const parsedTabId = idSchema.parse(tabId);
  await guardAuthenticatedAction({ action: "tab:close", duplicateKey: parsedTabId, duplicateTtlMs: 10_000 });
  await service.closeTab(parsedTabId);
  revalidatePath("/mesas");
}
