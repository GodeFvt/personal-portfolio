import { paginationQuerySchema } from "~~/shared/schemas/api";
import { apiError, apiPage, paginationMeta } from "../../../../utils/api-response";
import { requirePermission } from "../../../../utils/admin-auth";
import { useDatabase } from "../../../../utils/db";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");
  try { await requirePermission(event, "audit.read"); }
  catch (error) {
    const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 401;
    return apiError(event, status, { code: status === 403 ? "PERMISSION_DENIED" : "AUTH_REQUIRED", message: status === 403 ? "Permission denied." : "Authentication required." });
  }
  const parsed = paginationQuerySchema.safeParse(getQuery(event));
  if (!parsed.success) return apiError(event, 400, { code: "VALIDATION_ERROR", message: "Invalid pagination." });
  const { page, perPage } = parsed.data;
  const db = useDatabase();
  const [items, total] = await Promise.all([
    db.auditLog.findMany({
      skip: (page - 1) * perPage, take: perPage,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true, action: true, entityType: true, entityId: true, metadata: true, createdAt: true, actor: { select: { id: true, email: true } } },
    }),
    db.auditLog.count(),
  ]);
  return apiPage(items, paginationMeta(page, perPage, total));
});
