import { updateMediaSchema } from "~~/shared/schemas/media";
import { apiData, apiError } from "../../../utils/api-response";
import { requireCsrf, requirePermission, writeAuditLog } from "../../../utils/admin-auth";
import { useDatabase } from "../../../utils/db";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "private, no-store");
  let admin;
  try { await requireCsrf(event); admin = await requirePermission(event, "media.write"); }
  catch (error) { const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 401; return apiError(event, status, { code: status === 403 ? "PERMISSION_DENIED" : "AUTH_REQUIRED", message: status === 403 ? "Permission denied." : "Authentication required." }); }
  const id = getRouterParam(event, "id") ?? "";
  const parsed = updateMediaSchema.safeParse(await readBody(event));
  if (!parsed.success) return apiError(event, 400, { code: "VALIDATION_ERROR", message: "Please check the media fields." });
  const updated = await useDatabase().mediaAsset.updateMany({ where: { id, version: parsed.data.expectedVersion }, data: { alt: parsed.data.alt, ...(parsed.data.visibility ? { visibility: parsed.data.visibility } : {}), version: { increment: 1 } } });
  if (updated.count !== 1) return apiError(event, 409, { code: "VERSION_CONFLICT", message: "This media item changed. Reload and try again." });
  const asset = await useDatabase().mediaAsset.findUnique({ where: { id } });
  await writeAuditLog({ actorId: admin.user.id, action: "media.update", entityType: "MediaAsset", entityId: id, metadata: { version: asset?.version } });
  return apiData(asset ? { ...asset, size: asset.size.toString() } : null);
});

