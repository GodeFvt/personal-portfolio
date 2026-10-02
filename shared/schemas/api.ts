import { z } from "zod";

export const ApiErrorCode = {
  ACCOUNT_EXISTS: "ACCOUNT_EXISTS",
  AUTH_REQUIRED: "AUTH_REQUIRED",
  CSRF_REJECTED: "CSRF_REJECTED",
  DELEGATION_DENIED: "DELEGATION_DENIED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  INVALID_MEDIA_LINK: "INVALID_MEDIA_LINK",
  INVITATION_EXPIRED: "INVITATION_EXPIRED",
  LAST_LOGIN_METHOD: "LAST_LOGIN_METHOD",
  MEDIA_IN_USE: "MEDIA_IN_USE",
  MEDIA_NOT_PRIVATE: "MEDIA_NOT_PRIVATE",
  NOT_FOUND: "NOT_FOUND",
  OWNER_OR_VERSION_CONFLICT: "OWNER_OR_VERSION_CONFLICT",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  PROVIDER_NOT_READY: "PROVIDER_NOT_READY",
  PROVIDER_UNAVAILABLE: "PROVIDER_UNAVAILABLE",
  RATE_LIMITED: "RATE_LIMITED",
  REAUTH_REQUIRED: "REAUTH_REQUIRED",
  REQUEST_REJECTED: "REQUEST_REJECTED",
  ROLE_IN_USE: "ROLE_IN_USE",
  ROLE_KEY_TAKEN: "ROLE_KEY_TAKEN",
  SECRET_REQUIRED: "SECRET_REQUIRED",
  SECRET_STORAGE_UNAVAILABLE: "SECRET_STORAGE_UNAVAILABLE",
  SELF_SUSPEND: "SELF_SUSPEND",
  SITE_NOT_CONFIGURED: "SITE_NOT_CONFIGURED",
  SLUG_CONFLICT: "SLUG_CONFLICT",
  STORAGE_DELETE_FAILED: "STORAGE_DELETE_FAILED",
  STORAGE_PROVIDER_UNAVAILABLE: "STORAGE_PROVIDER_UNAVAILABLE",
  TEST_REQUIRED: "TEST_REQUIRED",
  UPLOAD_CONFLICT: "UPLOAD_CONFLICT",
  UPLOAD_REJECTED: "UPLOAD_REJECTED",
  UPLOAD_SIZE_MISMATCH: "UPLOAD_SIZE_MISMATCH",
  UPLOAD_TOKEN_INVALID: "UPLOAD_TOKEN_INVALID",
  UPLOAD_VERIFICATION_FAILED: "UPLOAD_VERIFICATION_FAILED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  VERSION_CONFLICT: "VERSION_CONFLICT",
} as const;

export const apiErrorCodeSchema = z.enum(ApiErrorCode);

export const requestIdSchema = z.string().min(1);

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(50).default(12),
});

export const paginationMetaSchema = z.object({
  page: z.number().int().min(1),
  perPage: z.number().int().min(1).max(50),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
});

export const apiErrorSchema = z.object({
  code: apiErrorCodeSchema,
  message: z.string().min(1),
  fields: z.record(z.string(), z.array(z.string())).optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
