import { HttpStatus } from "~~/server/utils/http-status";
import { ApiErrorCode } from "~~/shared/schemas/api";
import { publishNavigationSchema } from "~~/shared/schemas/admin-content";
import { apiData, apiError } from "../../utils/api-response";
import { requireCsrf, requirePermission } from "../../utils/admin-auth";
import { useDatabase } from "../../utils/db";
import { publishNavigationRevisions, VersionConflictError } from "../../services/content-drafts";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");
  let admin;
  try {
    await requireCsrf(event);
    admin = await requirePermission(event, "content.publish");
  } catch (error) {
    const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : HttpStatus.UNAUTHORIZED;
    return apiError(event, status, { code: status === HttpStatus.FORBIDDEN ? ApiErrorCode.PERMISSION_DENIED : ApiErrorCode.AUTH_REQUIRED, message: status === HttpStatus.FORBIDDEN ? "Permission denied." : "Authentication required." });
  }

  const parsed = publishNavigationSchema.safeParse(await readBody(event));
  if (!parsed.success) return apiError(event, HttpStatus.BAD_REQUEST, { code: ApiErrorCode.VALIDATION_ERROR, message: "Please check the submitted fields." });

  try {
    const result = await useDatabase().$transaction(
      (transaction) => publishNavigationRevisions(transaction, parsed.data.revisions, admin.user.id, event.context.requestId),
      { isolationLevel: "Serializable" },
    );
    return apiData(result);
  } catch (error) {
    if (error instanceof VersionConflictError || (typeof error === "object" && error && "code" in error && (error.code === "P2002" || error.code === "P2034"))) {
      return apiError(event, HttpStatus.CONFLICT, { code: ApiErrorCode.VERSION_CONFLICT, message: "This content changed. Reload before publishing again." });
    }
    throw error;
  }
});
