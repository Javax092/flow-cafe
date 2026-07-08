import { HTTP_STATUS } from "@/config/constants";

export type AppErrorOptions = {
  code: string;
  message: string;
  statusCode?: number;
  details?: unknown;
  cause?: unknown;
};

export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(options: AppErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = "AppError";
    this.code = options.code;
    this.statusCode = options.statusCode ?? HTTP_STATUS.badRequest;
    this.details = options.details;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
