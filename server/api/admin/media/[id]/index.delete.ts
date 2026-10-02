import { HttpStatus } from "~~/server/utils/http-status";
import { ApiErrorCode } from "~~/shared/schemas/api";
import { MediaStatus } from "~~/generated/prisma/client";
import { hasMediaReferences, mediaReferences } from "../../../../services/media";
import { mediaStorage } from "../../../../storage";
import { apiData, apiError } from "../../../../utils/api-response";
import { requireCsrf, requirePermission, writeAuditLog } from "../../../../utils/admin-auth";
import { useDatabase } from "../../../../utils/db";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "private, no-store");
  let admin;
  try { await requireCsrf(event); admin = await requirePermission(event, "media.write"); }
  catch (error) { const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : HttpStatus.UNAUTHORIZED; return apiError(event, status, { code: status === HttpStatus.FORBIDDEN ? ApiErrorCode.PERMISSION_DENIED : ApiErrorCode.AUTH_REQUIRED, message: status === HttpStatus.FORBIDDEN ? "Permission denied." : "Authentication required." }); }
  const id = getRouterParam(event, "id") ?? "";
  const asset = await useDatabase().mediaAsset.findUnique({ where: { id } });
  if (!asset) return apiError(event, HttpStatus.NOT_FOUND, { code: ApiErrorCode.NOT_FOUND, message: "Media was not found." });
  const references = await mediaReferences(id);
  if (hasMediaReferences(references)) return apiError(event, HttpStatus.CONFLICT, { code: ApiErrorCode.MEDIA_IN_USE, message: "Remove this media from published content and private drafts before deleting it." });
  await useDatabase().mediaAsset.update({ where: { id }, data: { status: MediaStatus.DELETING } });
  try {
    await mediaStorage(asset.provider).delete(asset.storageKey);
    await useDatabase().mediaAsset.delete({ where: { id } });
    await writeAuditLog({ actorId: admin.user.id, action: "media.delete", entityType: "MediaAsset", entityId: id, metadata: { provider: asset.provider } });
    return apiData({ deleted: true });
  } catch {
    await useDatabase().mediaAsset.updateMany({ where: { id }, data: { status: MediaStatus.FAILED } });
    return apiError(event, HttpStatus.SERVICE_UNAVAILABLE, { code: ApiErrorCode.STORAGE_DELETE_FAILED, message: "Storage deletion failed. The item was retained for cleanup retry." });
  }
});
