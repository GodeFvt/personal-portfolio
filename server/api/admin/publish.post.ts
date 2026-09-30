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
    const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 401;
    return apiError(event, status, { code: status === 403 ? "PERMISSION_DENIED" : "AUTH_REQUIRED", message: status === 403 ? "Permission denied." : "Authentication required." });
  }

  const parsed = publishNavigationSchema.safeParse(await readBody(event));
  if (!parsed.success) return apiError(event, 400, { code: "VALIDATION_ERROR", message: "Please check the submitted fields." });

  try {
    const result = await useDatabase().$transaction(
      (transaction) => publishNavigationRevisions(transaction, parsed.data.revisions, admin.user.id, event.context.requestId),
      { isolationLevel: "Serializable" },
    );
    return apiData(result);
  } catch (error) {
    if (error instanceof VersionConflictError || (typeof error === "object" && error && "code" in error && (error.code === "P2002" || error.code === "P2034"))) {
      return apiError(event, 409, { code: "VERSION_CONFLICT", message: "This content changed. Reload before publishing again." });
    }
    throw error;
  }
});
