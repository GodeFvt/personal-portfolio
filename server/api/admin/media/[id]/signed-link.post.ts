import { HttpStatus } from "~~/server/utils/http-status";
import { ApiErrorCode } from "~~/shared/schemas/api";
import { MediaStatus, MediaVisibility } from "~~/generated/prisma/client";
import { z } from "zod";
import { MAX_MEDIA_LINK_LIFETIME_SECONDS, signedMediaUrl } from "../../../../services/media-links";
import { apiData, apiError } from "../../../../utils/api-response";
import { requireCsrf, requirePermission, writeAuditLog } from "../../../../utils/admin-auth";
import { useDatabase } from "../../../../utils/db";

const bodySchema = z.object({
  lifetimeSeconds: z.number().int().min(60).max(MAX_MEDIA_LINK_LIFETIME_SECONDS),
});

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

  const id = getRouterParam(event, "id") ?? "";
  const parsed = bodySchema.safeParse(await readBody(event));
  if (!z.string().uuid().safeParse(id).success || !parsed.success) {
    return apiError(event, HttpStatus.BAD_REQUEST, { code: ApiErrorCode.VALIDATION_ERROR, message: "Choose a valid private-link lifetime." });
  }

  const asset = await useDatabase().mediaAsset.findFirst({
    where: { id, status: MediaStatus.READY, visibility: MediaVisibility.PRIVATE },
    select: { id: true },
  });
  if (!asset) return apiError(event, HttpStatus.CONFLICT, { code: ApiErrorCode.MEDIA_NOT_PRIVATE, message: "Only ready private media can receive an expiring link." });

  const result = signedMediaUrl(asset.id, parsed.data.lifetimeSeconds);
  await writeAuditLog({
    actorId: admin.user.id,
    action: "media.link.issue",
    entityType: "MediaAsset",
    entityId: asset.id,
    metadata: { lifetimeSeconds: parsed.data.lifetimeSeconds, expiresAt: result.expiresAt },
  });
  return apiData(result);
});
