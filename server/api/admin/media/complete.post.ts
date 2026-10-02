import { HttpStatus } from "~~/server/utils/http-status";
import { ApiErrorCode } from "~~/shared/schemas/api";
import { completeMediaUploadSchema } from "~~/shared/schemas/media";
import { mediaAuditMetadata, verifyAndCompleteMedia, verifyMediaUploadToken } from "../../../services/media";
import { apiData, apiError } from "../../../utils/api-response";
import { requireCsrf, requirePermission, writeAuditLog } from "../../../utils/admin-auth";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "private, no-store");
  let admin;
  try {
    await requireCsrf(event);
    admin = await requirePermission(event, "media.write");
  } catch (error) {
    const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : HttpStatus.UNAUTHORIZED;
    return apiError(event, status, { code: status === HttpStatus.FORBIDDEN ? ApiErrorCode.PERMISSION_DENIED : ApiErrorCode.AUTH_REQUIRED, message: status === HttpStatus.FORBIDDEN ? "Permission denied." : "Authentication required." });
  }
  const parsed = completeMediaUploadSchema.safeParse(await readBody(event));
  if (!parsed.success) return apiError(event, HttpStatus.BAD_REQUEST, { code: ApiErrorCode.VALIDATION_ERROR, message: "Upload completion data is invalid." });
  if (!verifyMediaUploadToken(parsed.data.uploadToken, { assetId: parsed.data.id, sessionId: admin.session.id, userId: admin.user.id })) {
    return apiError(event, HttpStatus.FORBIDDEN, { code: ApiErrorCode.UPLOAD_TOKEN_INVALID, message: "Upload token is invalid or expired." });
  }
  try {
    const asset = await verifyAndCompleteMedia(parsed.data.id);
    await writeAuditLog({ actorId: admin.user.id, action: "media.upload.complete", entityType: "MediaAsset", entityId: asset.id, metadata: mediaAuditMetadata(asset) });
    return apiData({ ...asset, size: asset.size.toString(), contentUrl: `/api/admin/media/${asset.id}/content` });
  } catch (error) {
    return apiError(event, HttpStatus.UNPROCESSABLE_ENTITY, { code: ApiErrorCode.UPLOAD_VERIFICATION_FAILED, message: error instanceof Error ? error.message : "The uploaded object could not be verified." });
  }
});

