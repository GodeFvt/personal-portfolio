import { MediaProvider, MediaStatus } from "~~/generated/prisma/client";
import { mediaSizeLimit } from "~~/shared/schemas/media";
import { verifyMediaUploadToken } from "../../../../services/media";
import { mediaStorage } from "../../../../storage";
import { apiData, apiError } from "../../../../utils/api-response";
import { requireCsrf, requirePermission } from "../../../../utils/admin-auth";
import { useDatabase } from "../../../../utils/db";

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
  const id = getRouterParam(event, "id") ?? "";
  const uploadToken = getHeader(event, "x-media-upload-token") ?? "";
  if (!verifyMediaUploadToken(uploadToken, { assetId: id, sessionId: admin.session.id, userId: admin.user.id })) {
    return apiError(event, 403, { code: "UPLOAD_TOKEN_INVALID", message: "Upload token is invalid or expired." });
  }
  const asset = await useDatabase().mediaAsset.findFirst({ where: { id, provider: { in: [MediaProvider.LOCAL, MediaProvider.CLOUDFLARE_R2, MediaProvider.MINIO] }, status: MediaStatus.PENDING } });
  if (!asset) return apiError(event, 404, { code: "NOT_FOUND", message: "Upload reservation was not found." });
  const limit = mediaSizeLimit(asset.mimeType);
  const contentLength = Number(getHeader(event, "content-length") ?? 0);
  if (contentLength > limit || contentLength !== Number(asset.size)) return apiError(event, 413, { code: "UPLOAD_SIZE_MISMATCH", message: "Uploaded file size does not match the reservation." });
  const raw = await readRawBody(event, false);
  const buffer = Buffer.isBuffer(raw) ? raw : Buffer.from(raw ?? "");
  if (buffer.length !== Number(asset.size) || buffer.length > limit) return apiError(event, 413, { code: "UPLOAD_SIZE_MISMATCH", message: "Uploaded file size does not match the reservation." });
  await mediaStorage(asset.provider).upload(asset.storageKey, buffer, asset.mimeType);
  return apiData({ uploaded: true });
});

