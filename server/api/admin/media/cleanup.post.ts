import { HttpStatus } from "~~/server/utils/http-status";
import { ApiErrorCode } from "~~/shared/schemas/api";
import { cleanupOrphanMedia } from "../../../services/media";
import { apiData, apiError } from "../../../utils/api-response";
import { requireCsrf, requirePermission, writeAuditLog } from "../../../utils/admin-auth";

export default defineEventHandler(async (event) => {
  let admin;
  try { await requireCsrf(event); admin = await requirePermission(event, "media.write"); }
  catch (error) { const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : HttpStatus.UNAUTHORIZED; return apiError(event, status, { code: status === HttpStatus.FORBIDDEN ? ApiErrorCode.PERMISSION_DENIED : ApiErrorCode.AUTH_REQUIRED, message: status === HttpStatus.FORBIDDEN ? "Permission denied." : "Authentication required." }); }
  const result = await cleanupOrphanMedia();
  await writeAuditLog({ actorId: admin.user.id, action: "media.cleanup", entityType: "MediaAsset", metadata: result });
  return apiData(result);
});

