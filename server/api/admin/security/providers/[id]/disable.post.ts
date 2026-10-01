import { providerDisableSchema } from "~~/shared/schemas/admin-security";
import { apiData, apiError } from "../../../../../utils/api-response";
import { requireCsrf, requireFreshAuthentication, requirePermission } from "../../../../../utils/admin-auth";
import { useDatabase } from "../../../../../utils/db";
import { serializable } from "../../../../../services/access-control";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");
  let admin;
  try { await requireCsrf(event); admin = await requirePermission(event, "auth.providers.manage"); requireFreshAuthentication(admin); }
  catch (error) { const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 401; return apiError(event, status, { code: status === 403 ? "REAUTH_REQUIRED" : "AUTH_REQUIRED", message: status === 403 ? "Sign in again before disabling a login method." : "Authentication required." }); }
  const id = getRouterParam(event, "id");
  const parsed = providerDisableSchema.safeParse(await readBody(event));
  if (!id || !parsed.success) return apiError(event, 400, { code: "VALIDATION_ERROR", message: "Invalid disable request." });
  const db = useDatabase();
  const provider = await db.oAuthProvider.findUnique({ where: { id } });
  if (!provider) return apiError(event, 404, { code: "NOT_FOUND", message: "Login provider not found." });
  if (provider.version !== parsed.data.expectedVersion) return apiError(event, 409, { code: "VERSION_CONFLICT", message: "This provider changed. Reload before disabling." });
  const result = await serializable(async (transaction) => {
    const revoked = await transaction.adminSession.updateMany({ where: { providerId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    const changedProvider = await transaction.oAuthProvider.updateMany({ where: { id, version: parsed.data.expectedVersion }, data: { enabled: false, version: { increment: 1 } } });
    if (changedProvider.count !== 1) throw createError({ statusCode: 409, statusMessage: "This provider changed. Reload before disabling." });
    const updated = await transaction.oAuthProvider.findUniqueOrThrow({ where: { id } });
    await transaction.auditLog.create({ data: { actorId: admin.user.id, action: "oauth.provider.disabled", entityType: "OAuthProvider", entityId: id, metadata: { sessionsRevoked: revoked.count, requestId: event.context.requestId } } });
    return updated;
  }, db);
  return apiData({ provider: result });
});
