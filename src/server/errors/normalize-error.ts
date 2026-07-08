import { HTTP_STATUS } from "@/config/constants";
import { AppError, isAppError } from "@/server/errors/app-error";

export type NormalizedError = {
  code: string;
  message: string;
  statusCode: number;
  details?: unknown;
};

export function normalizeError(error: unknown): NormalizedError {
  if (isAppError(error)) {
    return {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
    };
  }

  return {
    code: "INTERNAL_SERVER_ERROR",
    message: "Ocorreu um erro interno.",
    statusCode: HTTP_STATUS.internalServerError,
  };
}

export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  return new AppError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Ocorreu um erro interno.",
    statusCode: HTTP_STATUS.internalServerError,
    cause: error,
  });
}
