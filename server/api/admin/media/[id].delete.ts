import { MediaStatus } from "~~/generated/prisma/client";
import { hasMediaReferences, mediaReferences } from "../../../services/media";
import { mediaStorage } from "../../../storage";
import { apiData, apiError } from "../../../utils/api-response";
import { requireCsrf, requirePermission, writeAuditLog } from "../../../utils/admin-auth";
import { useDatabase } from "../../../utils/db";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "private, no-store");
  let admin;
  try { await requireCsrf(event); admin = await requirePermission(event, "media.write"); }
  catch (error) { const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 401; return apiError(event, status, { code: status === 403 ? "PERMISSION_DENIED" : "AUTH_REQUIRED", message: status === 403 ? "Permission denied." : "Authentication required." }); }
  const id = getRouterParam(event, "id") ?? "";
  const asset = await useDatabase().mediaAsset.findUnique({ where: { id } });
  if (!asset) return apiError(event, 404, { code: "NOT_FOUND", message: "Media was not found." });
  const references = await mediaReferences(id);
  if (hasMediaReferences(references)) return apiError(event, 409, { code: "MEDIA_IN_USE", message: "Remove this media from published content and private drafts before deleting it." });
  await useDatabase().mediaAsset.update({ where: { id }, data: { status: MediaStatus.DELETING } });
  try {
    await mediaStorage(asset.provider).delete(asset.storageKey);
    await useDatabase().mediaAsset.delete({ where: { id } });
    await writeAuditLog({ actorId: admin.user.id, action: "media.delete", entityType: "MediaAsset", entityId: id, metadata: { provider: asset.provider } });
    return apiData({ deleted: true });
  } catch {
    await useDatabase().mediaAsset.updateMany({ where: { id }, data: { status: MediaStatus.FAILED } });
    return apiError(event, 503, { code: "STORAGE_DELETE_FAILED", message: "Storage deletion failed. The item was retained for cleanup retry." });
  }
});
