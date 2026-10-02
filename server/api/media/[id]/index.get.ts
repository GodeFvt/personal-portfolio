import { HttpStatus } from "~~/server/utils/http-status";
import { ApiErrorCode } from "~~/shared/schemas/api";
import { z } from "zod";
import { MediaStatus, MediaVisibility } from "~~/generated/prisma/client";
import { apiError } from "../../../utils/api-response";
import { useDatabase } from "../../../utils/db";
import { mediaStorage } from "../../../storage";
import { verifyPrivateMediaLink } from "../../../services/media-links";

export default defineEventHandler(async (event) => {
  setHeader(event, "X-Content-Type-Options", "nosniff");
  const id = getRouterParam(event, "id");
  if (!id || !z.string().uuid().safeParse(id).success) {
    return apiError(event, HttpStatus.BAD_REQUEST, { code: ApiErrorCode.VALIDATION_ERROR, message: "Media id is required." });
  }

  const asset = await useDatabase().mediaAsset.findFirst({ where: { id, status: MediaStatus.READY } });
  if (!asset) {
    return apiError(event, HttpStatus.NOT_FOUND, { code: ApiErrorCode.NOT_FOUND, message: "Media not found." });
  }

  if (asset.visibility === MediaVisibility.PRIVATE) {
    const query = getQuery(event);
    const expiresAt = typeof query.expires === "string" ? Number(query.expires) : Number.NaN;
    const signature = typeof query.signature === "string" ? query.signature : "";
    if (!verifyPrivateMediaLink(asset.id, expiresAt, signature)) {
      return apiError(event, HttpStatus.FORBIDDEN, { code: ApiErrorCode.INVALID_MEDIA_LINK, message: "This private media link is invalid or has expired." });
    }
    setHeader(event, "Cache-Control", "private, no-store");
  } else {
    setHeader(event, "Cache-Control", "public, max-age=0, must-revalidate");
  }

  setHeader(event, "Content-Type", asset.mimeType);
  setHeader(
    event,
    "Content-Disposition",
    `inline; filename*=UTF-8''${encodeURIComponent(asset.originalName)}`,
  );
  const object = await mediaStorage(asset.provider).read(asset.storageKey);
  if (!object) return apiError(event, HttpStatus.NOT_FOUND, { code: ApiErrorCode.NOT_FOUND, message: "Media not found." });
  setHeader(event, "Content-Length", object.size);
  return sendStream(event, object.stream);
});
