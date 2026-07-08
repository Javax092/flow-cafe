import { env } from "@/config/env";

type LogContext = Record<string, unknown>;

type LogLevel = "info" | "warn" | "error";

function serializeError(error: Error) {
  return {
    name: error.name,
    message: error.message,
    stack: env.NODE_ENV === "development" ? error.stack : undefined,
  };
}

function sanitizeContext(context: LogContext): LogContext {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [
      key,
      value instanceof Error ? serializeError(value) : value,
    ]),
  );
}

function write(level: LogLevel, message: string, context: LogContext = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...sanitizeContext(context),
  };

  const output = JSON.stringify(entry);
  const method = level === "info" ? console.info : level === "warn" ? console.warn : console.error;
  method(output);
}

export const logger = {
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, context?: LogContext) => write("error", message, context),

  child(baseContext: LogContext) {
    return {
      info: (message: string, context?: LogContext) =>
        write("info", message, { ...baseContext, ...context }),
      warn: (message: string, context?: LogContext) =>
        write("warn", message, { ...baseContext, ...context }),
      error: (message: string, context?: LogContext) =>
        write("error", message, { ...baseContext, ...context }),
    };
  },
};
