import { apiData, apiError } from "../../../../utils/api-response";
import { requireAdmin, requireCsrf, requireFreshAuthentication } from "../../../../utils/admin-auth";
import { useDatabase } from "../../../../utils/db";
import { serializable } from "../../../../services/access-control";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");
  let admin;
  try { await requireCsrf(event); admin = await requireAdmin(event); requireFreshAuthentication(admin); }
  catch (error) { const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 401; return apiError(event, status, { code: status === 403 ? "REAUTH_REQUIRED" : "AUTH_REQUIRED", message: status === 403 ? "Sign in again before unlinking an identity." : "Authentication required." }); }
  const id = getRouterParam(event, "id");
  if (!id) return apiError(event, 400, { code: "VALIDATION_ERROR", message: "Identity id is required." });
  const db = useDatabase();
  let currentSessionRevoked = false;
  try { await serializable(async (transaction) => {
    const identity = await transaction.oAuthIdentity.findUnique({ where: { id }, include: { user: { include: { _count: { select: { oauthIdentities: true } } } }, provider: true } });
    if (!identity || identity.userId !== admin.user.id) throw createError({ statusCode: 404, statusMessage: "Linked identity not found." });
    if (!identity.user.passwordHash && identity.user._count.oauthIdentities <= 1) throw createError({ statusCode: 409, statusMessage: "Add another login method before unlinking this identity." });
    currentSessionRevoked = admin.session.providerId === identity.providerId;
    await transaction.oAuthIdentity.delete({ where: { id } });
    await transaction.adminSession.updateMany({ where: { userId: admin.user.id, providerId: identity.providerId, revokedAt: null }, data: { revokedAt: new Date() } });
    await transaction.auditLog.create({ data: { actorId: admin.user.id, action: "oauth.identity.unlinked", entityType: "OAuthIdentity", entityId: id, metadata: { providerKey: identity.provider.key, requestId: event.context.requestId } } });
  }, db); }
  catch (error) {
    const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 500;
    if (status === 404 || status === 409) return apiError(event, status, { code: status === 404 ? "NOT_FOUND" : "LAST_LOGIN_METHOD", message: error instanceof Error ? error.message : "Identity could not be unlinked." });
    throw error;
  }
  if (currentSessionRevoked) await clearUserSession(event);
  return apiData({ unlinked: true, loggedOut: currentSessionRevoked });
});
