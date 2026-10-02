import { HttpStatus } from "~~/server/utils/http-status";
import { ApiErrorCode } from "~~/shared/schemas/api";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { MediaProvider, MediaStatus, MediaVisibility } from "~~/generated/prisma/client";
import { mediaSizeLimit, startMediaUploadSchema } from "~~/shared/schemas/media";
import { issueMediaUploadToken, safeOriginalName, verifyAndCompleteMedia, verifyMediaUploadToken } from "../../../services/media";
import { mediaStorage, resolveUploadProvider, type UploadProviderKey } from "../../../storage";
import { apiData, apiError } from "../../../utils/api-response";
import { requireCsrf, requirePermission, writeAuditLog } from "../../../utils/admin-auth";
import { useDatabase } from "../../../utils/db";
import { getServerEnv } from "../../../utils/env";

interface ClientPayload { id: string; uploadToken: string }

function parseClientPayload(value: string | null): ClientPayload {
  if (!value) throw createError({ statusCode: HttpStatus.BAD_REQUEST, statusMessage: "Upload payload is required." });
  try {
    const payload = JSON.parse(value) as ClientPayload;
    if (!payload.id || !payload.uploadToken) throw new Error();
    return payload;
  } catch {
    throw createError({ statusCode: HttpStatus.BAD_REQUEST, statusMessage: "Upload payload is invalid." });
  }
}

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "private, no-store");
  const body = await readBody(event);

  if (body && typeof body === "object" && typeof body.type === "string" && body.type.startsWith("blob.")) {
    try {
      const env = getServerEnv();
      return await handleUpload({
        request: event.node.req,
        body: body as HandleUploadBody,
        ...(env.BLOB_READ_WRITE_TOKEN ? { token: env.BLOB_READ_WRITE_TOKEN } : {}),
        onBeforeGenerateToken: async (pathname, clientPayload) => {
          await requireCsrf(event);
          const admin = await requirePermission(event, "media.write");
          const payload = parseClientPayload(clientPayload);
          if (!verifyMediaUploadToken(payload.uploadToken, { assetId: payload.id, sessionId: admin.session.id, userId: admin.user.id })) {
            throw createError({ statusCode: HttpStatus.FORBIDDEN, statusMessage: "Upload token is invalid or expired." });
          }
          const asset = await useDatabase().mediaAsset.findFirst({ where: { id: payload.id, provider: MediaProvider.VERCEL_BLOB, status: MediaStatus.PENDING } });
          if (!asset || asset.storageKey !== pathname) throw createError({ statusCode: HttpStatus.CONFLICT, statusMessage: "Upload reservation does not match." });
          return {
            allowedContentTypes: [asset.mimeType],
            maximumSizeInBytes: mediaSizeLimit(asset.mimeType),
            addRandomSuffix: false,
            allowOverwrite: false,
            validUntil: Date.now() + 10 * 60 * 1000,
            tokenPayload: JSON.stringify(payload),
            callbackUrl: `${env.NUXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/api/admin/media/upload`,
          };
        },
        onUploadCompleted: async ({ blob, tokenPayload }) => {
          const payload = parseClientPayload(tokenPayload ?? null);
          if (!verifyMediaUploadToken(payload.uploadToken, { assetId: payload.id })) throw new Error("Upload callback token is invalid.");
          const asset = await useDatabase().mediaAsset.findUnique({ where: { id: payload.id } });
          if (!asset || asset.storageKey !== blob.pathname) throw new Error("Uploaded Blob does not match its reservation.");
          await verifyAndCompleteMedia(asset.id);
        },
      });
    } catch (error) {
      const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : HttpStatus.BAD_REQUEST;
      return apiError(event, status, { code: status === HttpStatus.FORBIDDEN ? ApiErrorCode.PERMISSION_DENIED : ApiErrorCode.UPLOAD_REJECTED, message: error instanceof Error ? error.message : "Upload was rejected." });
    }
  }

  let admin;
  try {
    await requireCsrf(event);
    admin = await requirePermission(event, "media.write");
  } catch (error) {
    const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : HttpStatus.UNAUTHORIZED;
    return apiError(event, status, { code: status === HttpStatus.FORBIDDEN ? ApiErrorCode.PERMISSION_DENIED : ApiErrorCode.AUTH_REQUIRED, message: status === HttpStatus.FORBIDDEN ? "Permission denied." : "Authentication required." });
  }
  const parsed = startMediaUploadSchema.safeParse(body);
  if (!parsed.success) return apiError(event, HttpStatus.BAD_REQUEST, { code: ApiErrorCode.VALIDATION_ERROR, message: parsed.error.issues[0]?.message ?? "Please check the selected file." });
  let provider: MediaProvider;
  try {
    provider = resolveUploadProvider(parsed.data.provider as UploadProviderKey | undefined);
  } catch (error) {
    return apiError(event, HttpStatus.CONFLICT, { code: ApiErrorCode.STORAGE_PROVIDER_UNAVAILABLE, message: error instanceof Error ? error.message : "The selected storage provider is unavailable." });
  }
  const originalName = safeOriginalName(parsed.data.originalName);
  if (!originalName) return apiError(event, HttpStatus.BAD_REQUEST, { code: ApiErrorCode.VALIDATION_ERROR, message: "File name is required." });
  const storageKey = `uploads/${parsed.data.id}/${originalName}`;
  try {
    const asset = await useDatabase().mediaAsset.create({
      data: {
        id: parsed.data.id,
        provider,
        storageKey,
        originalName,
        mimeType: parsed.data.mimeType,
        size: BigInt(parsed.data.size),
        alt: parsed.data.alt,
        visibility: MediaVisibility.PRIVATE,
        status: MediaStatus.PENDING,
      },
    });
    const uploadToken = issueMediaUploadToken({ assetId: asset.id, sessionId: admin.session.id, userId: admin.user.id });
    const storage = mediaStorage(provider);
    const uploadUrl = provider === MediaProvider.VERCEL_BLOB
      ? undefined
      : storage.createUploadUrl
        ? await storage.createUploadUrl(storageKey, asset.mimeType, 10 * 60)
        : `/api/admin/media/${asset.id}/content`;
    await writeAuditLog({ actorId: admin.user.id, action: "media.upload.reserve", entityType: "MediaAsset", entityId: asset.id, metadata: { provider, mimeType: asset.mimeType, size: asset.size.toString() } });
    return apiData({
      id: asset.id,
      provider: provider === MediaProvider.VERCEL_BLOB
        ? "vercel-blob"
        : provider === MediaProvider.CLOUDFLARE_R2
          ? "cloudflare-r2"
          : provider === MediaProvider.MINIO
            ? "minio"
            : "local",
      storageKey,
      uploadToken,
      uploadUrl,
      directUpload: Boolean(storage.createUploadUrl),
      handleUploadUrl: provider === MediaProvider.VERCEL_BLOB ? "/api/admin/media/upload" : undefined,
    });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return apiError(event, HttpStatus.CONFLICT, { code: ApiErrorCode.UPLOAD_CONFLICT, message: "This upload reservation already exists." });
    throw error;
  }
});
