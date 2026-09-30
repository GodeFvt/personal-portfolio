import type { H3Event } from "h3";
import type { ApiError, PaginationMeta } from "~~/shared/schemas/api";

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
