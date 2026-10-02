import { HttpStatus } from "~~/server/utils/http-status";
import { ApiErrorCode } from "~~/shared/schemas/api";
import { MediaStatus } from "~~/generated/prisma/client";
import { mediaStorage } from "../../../../storage";
import { apiError } from "../../../../utils/api-response";
import { requirePermission } from "../../../../utils/admin-auth";
import { useDatabase } from "../../../../utils/db";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "private, no-store");
  setHeader(event, "x-content-type-options", "nosniff");
  try {
    await requirePermission(event, "content.read");
  } catch (error) {
    const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : HttpStatus.UNAUTHORIZED;
    return apiError(event, status, { code: status === HttpStatus.FORBIDDEN ? ApiErrorCode.PERMISSION_DENIED : ApiErrorCode.AUTH_REQUIRED, message: status === HttpStatus.FORBIDDEN ? "Permission denied." : "Authentication required." });
  }
  const id = getRouterParam(event, "id") ?? "";
  const asset = await useDatabase().mediaAsset.findFirst({ where: { id, status: MediaStatus.READY } });
  if (!asset) return apiError(event, HttpStatus.NOT_FOUND, { code: ApiErrorCode.NOT_FOUND, message: "Media was not found." });
  const object = await mediaStorage(asset.provider).read(asset.storageKey);
  if (!object) return apiError(event, HttpStatus.NOT_FOUND, { code: ApiErrorCode.NOT_FOUND, message: "Media object was not found." });
  setHeader(event, "content-type", asset.mimeType);
  setHeader(event, "content-length", object.size);
  setHeader(event, "content-disposition", `${asset.mimeType === "application/pdf" ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(asset.originalName)}`);
  return sendStream(event, object.stream);
});

