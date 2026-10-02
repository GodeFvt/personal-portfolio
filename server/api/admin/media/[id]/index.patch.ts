import { HttpStatus } from "~~/server/utils/http-status";
import { ApiErrorCode } from "~~/shared/schemas/api";
import { updateMediaSchema } from "~~/shared/schemas/media";
import { apiData, apiError } from "../../../../utils/api-response";
import { requireCsrf, requirePermission, writeAuditLog } from "../../../../utils/admin-auth";
import { useDatabase } from "../../../../utils/db";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "private, no-store");
  let admin;
  try { await requireCsrf(event); admin = await requirePermission(event, "media.write"); }
  catch (error) { const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : HttpStatus.UNAUTHORIZED; return apiError(event, status, { code: status === HttpStatus.FORBIDDEN ? ApiErrorCode.PERMISSION_DENIED : ApiErrorCode.AUTH_REQUIRED, message: status === HttpStatus.FORBIDDEN ? "Permission denied." : "Authentication required." }); }
  const id = getRouterParam(event, "id") ?? "";
  const parsed = updateMediaSchema.safeParse(await readBody(event));
  if (!parsed.success) return apiError(event, HttpStatus.BAD_REQUEST, { code: ApiErrorCode.VALIDATION_ERROR, message: "Please check the media fields." });
  const updated = await useDatabase().mediaAsset.updateMany({ where: { id, version: parsed.data.expectedVersion }, data: { alt: parsed.data.alt, ...(parsed.data.visibility ? { visibility: parsed.data.visibility } : {}), version: { increment: 1 } } });
  if (updated.count !== 1) return apiError(event, HttpStatus.CONFLICT, { code: ApiErrorCode.VERSION_CONFLICT, message: "This media item changed. Reload and try again." });
  const asset = await useDatabase().mediaAsset.findUnique({ where: { id } });
  await writeAuditLog({ actorId: admin.user.id, action: "media.update", entityType: "MediaAsset", entityId: id, metadata: { version: asset?.version } });
  return apiData(asset ? { ...asset, size: asset.size.toString() } : null);
});

