import type { ApiError, ApiErrorCode } from "../../shared/schemas/api";
import type { HttpStatus } from "./http-status";

export class AppError extends Error {
  readonly statusCode: HttpStatus;
  readonly code: ApiErrorCode;
  readonly fields?: ApiError["fields"];

  constructor(input: {
    statusCode: HttpStatus;
    code: ApiErrorCode;
    message: string;
    fields?: ApiError["fields"];
    cause?: unknown;
  }) {
    super(input.message, { cause: input.cause });
    this.name = "AppError";
    this.statusCode = input.statusCode;
    this.code = input.code;
    this.fields = input.fields;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
