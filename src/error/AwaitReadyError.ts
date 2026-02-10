export class AwaitReadyError extends Error {
  constructor(code: ErrorCode, { message, cause }: { message?: string; cause?: Error } = {}) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
    this.name = "AwaitReadyError";
    this.cause = cause;
  }
}

export const isAwaitReadyError = (error: unknown): error is AwaitReadyError =>
  error instanceof Error && error.name === "AwaitReadyError";

export const errorMessages = {
  TIMEOUT: "Connection timed out",
  VALIDATION_FAILED: "Validation failed",
  UNKNOWN: "Unknown error",
  HOST_NOT_FOUND: "Host not found",
};

export type ErrorCode = keyof typeof errorMessages;

export const ErrorCodes = {
  TIMEOUT: "TIMEOUT",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  UNKNOWN: "UNKNOWN",
  HOST_NOT_FOUND: "HOST_NOT_FOUND",
} satisfies {
  [K in ErrorCode]: `${K}`;
};
