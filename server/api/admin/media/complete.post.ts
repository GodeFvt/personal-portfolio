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
    const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 401;
    return apiError(event, status, { code: status === 403 ? "PERMISSION_DENIED" : "AUTH_REQUIRED", message: status === 403 ? "Permission denied." : "Authentication required." });
  }
  const parsed = completeMediaUploadSchema.safeParse(await readBody(event));
  if (!parsed.success) return apiError(event, 400, { code: "VALIDATION_ERROR", message: "Upload completion data is invalid." });
  if (!verifyMediaUploadToken(parsed.data.uploadToken, { assetId: parsed.data.id, sessionId: admin.session.id, userId: admin.user.id })) {
    return apiError(event, 403, { code: "UPLOAD_TOKEN_INVALID", message: "Upload token is invalid or expired." });
  }
  try {
    const asset = await verifyAndCompleteMedia(parsed.data.id);
    await writeAuditLog({ actorId: admin.user.id, action: "media.upload.complete", entityType: "MediaAsset", entityId: asset.id, metadata: mediaAuditMetadata(asset) });
    return apiData({ ...asset, size: asset.size.toString(), contentUrl: `/api/admin/media/${asset.id}/content` });
  } catch (error) {
    return apiError(event, 422, { code: "UPLOAD_VERIFICATION_FAILED", message: error instanceof Error ? error.message : "The uploaded object could not be verified." });
  }
});

