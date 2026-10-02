import type { H3Event } from "h3";
import { ApiErrorCode, type ApiError, type PaginationMeta } from "../../shared/schemas/api";
import { isAppError } from "./app-error";
import { HttpStatus } from "./http-status";

export function apiData<T>(data: T, meta?: Record<string, unknown>) {
  return meta ? { data, meta } : { data };
}

export function apiPage<T>(
  items: T[],
  pagination: PaginationMeta,
  data: Record<string, unknown> = {},
) {
  return { data: { ...data, items }, meta: { pagination } };
}

export function apiError(
  event: H3Event,
  statusCode: number,
  error: ApiError,
  requestId = event.context.requestId ?? crypto.randomUUID(),
) {
  setResponseStatus(event, statusCode);
  return { data: null, error, meta: { requestId } };
}

export function apiErrorFromException(event: H3Event, error: unknown) {
  if (isAppError(error)) {
    return apiError(event, error.statusCode, {
      code: error.code,
      message: error.message,
      ...(error.fields ? { fields: error.fields } : {}),
    });
  }

  throw error;
}

export function apiAuthorizationError(
  event: H3Event,
  error: unknown,
  options: { forbiddenCode?: ApiError["code"]; forbiddenMessage?: string } = {},
) {
  const statusCode =
    typeof error === "object" && error && "statusCode" in error && Number(error.statusCode) === HttpStatus.FORBIDDEN
      ? HttpStatus.FORBIDDEN
      : HttpStatus.UNAUTHORIZED;

  return apiError(event, statusCode, statusCode === HttpStatus.FORBIDDEN
    ? {
        code: options.forbiddenCode ?? ApiErrorCode.PERMISSION_DENIED,
        message: options.forbiddenMessage ?? "Permission denied.",
      }
    : { code: ApiErrorCode.AUTH_REQUIRED, message: "Authentication required." });
}

export function paginationMeta(page: number, perPage: number, total: number): PaginationMeta {
  const totalPages = total === 0 ? 0 : Math.ceil(total / perPage);
  return {
    page,
    perPage,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1 && totalPages > 0,
  };
}
