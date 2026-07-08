import "server-only";

import { PrintJobStatus } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import type { CreatePrintJobInput, PrintTransactionClient } from "../types";

export class PrintRepository {
  private client(tx?: PrintTransactionClient) {
    return tx ?? prisma;
  }

  async findExisting(data: CreatePrintJobInput, tx?: PrintTransactionClient) {
    return this.client(tx).printJob.findUnique({
      where: {
        businessId_orderId_documentType_sector: {
          businessId: data.businessId,
          orderId: data.orderId,
          documentType: data.documentType,
          sector: data.sector,
        },
      },
    });
  }

  async create(data: CreatePrintJobInput, tx?: PrintTransactionClient) {
    return this.client(tx).printJob.create({ data: {
      businessId: data.businessId,
      orderId: data.orderId,
      documentType: data.documentType,
      sector: data.sector,
      printerName: data.printerName,
      payload: data.payload ?? undefined,
    } });
  }

  async listByBusiness(businessId: string) {
    return prisma.printJob.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async findPending(limit = 10) {
    return prisma.printJob.findMany({
      where: {
        status: PrintJobStatus.PENDING,
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }],
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  }

  async lockJob(jobId: string, lockedBy: string) {
    return prisma.printJob.updateMany({
      where: { id: jobId, status: PrintJobStatus.PENDING, lockedAt: null },
      data: { status: PrintJobStatus.PROCESSING, lockedAt: new Date(), lockedBy },
    });
  }

  async markPrinted(jobId: string) {
    return prisma.printJob.update({
      where: { id: jobId },
      data: {
        status: PrintJobStatus.PRINTED,
        printedAt: new Date(),
        lastError: null,
        nextRetryAt: null,
        lockedAt: null,
        lockedBy: null,
      },
    });
  }

  async markFailed(jobId: string, error: string, nextRetryAt?: Date) {
    return prisma.printJob.update({
      where: { id: jobId },
      data: {
        status: PrintJobStatus.FAILED,
        attempts: { increment: 1 },
        lastError: error.slice(0, 1000),
        nextRetryAt,
        lockedAt: null,
        lockedBy: null,
      },
    });
  }

  async requeueDue() {
    return prisma.printJob.updateMany({
      where: {
        status: PrintJobStatus.FAILED,
        attempts: { lt: 5 },
        nextRetryAt: { lte: new Date() },
      },
      data: { status: PrintJobStatus.PENDING, lockedAt: null, lockedBy: null },
    });
  }

  async retry(businessId: string, jobId: string) {
    return prisma.printJob.updateMany({
      where: {
        id: jobId,
        businessId,
        status: { in: [PrintJobStatus.FAILED, PrintJobStatus.STUCK] },
      },
      data: {
        status: PrintJobStatus.PENDING,
        attempts: 0,
        nextRetryAt: null,
        lockedAt: null,
        lockedBy: null,
      },
    });
  }

  async recoverStuck(olderThan: Date) {
    return prisma.printJob.updateMany({
      where: { status: PrintJobStatus.PROCESSING, lockedAt: { lt: olderThan } },
      data: {
        status: PrintJobStatus.FAILED,
        lastError: "Execução interrompida antes da confirmação da impressora.",
        lockedAt: null,
        lockedBy: null,
      },
    });
  }
}

export const printRepository = new PrintRepository();
