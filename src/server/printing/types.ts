import type {
  Prisma,
  PrintDocumentType,
  PrintJob,
  PrintJobStatus,
} from "@prisma/client";

export type PrintJobEntity = PrintJob;
export type PrintJobState = PrintJobStatus;
export type PrintTransactionClient = Prisma.TransactionClient;

export type CreatePrintJobInput = {
  businessId: string;
  orderId: string;
  documentType: PrintDocumentType;
  sector: string;
  printerName?: string;
  payload?: Prisma.InputJsonValue;
};

export interface PrintTransport {
  print(job: PrintJob): Promise<void>;
}
