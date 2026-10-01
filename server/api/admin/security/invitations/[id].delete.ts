import { apiData, apiError } from "../../../../utils/api-response";
import { requireCsrf, requirePermission } from "../../../../utils/admin-auth";
import { useDatabase } from "../../../../utils/db";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");
  let admin;
  try {
    await requireCsrf(event);
    admin = await requirePermission(event, "users.invite");
  } catch (error) {
    const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 401;
    return apiError(event, status, { code: status === 403 ? "PERMISSION_DENIED" : "AUTH_REQUIRED", message: status === 403 ? "Permission denied." : "Authentication required." });
  }
  const id = getRouterParam(event, "id");
  if (!id) return apiError(event, 400, { code: "VALIDATION_ERROR", message: "Invitation id is required." });
  const invitation = await useDatabase().userInvitation.findUnique({ where: { id } });
  if (!invitation || invitation.acceptedAt) return apiError(event, 404, { code: "NOT_FOUND", message: "Invitation not found." });
  await useDatabase().$transaction(async (transaction) => {
    await transaction.userInvitation.delete({ where: { id } });
    const otherInvitation = await transaction.userInvitation.findFirst({
      where: { normalizedEmail: invitation.normalizedEmail, acceptedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    if (!otherInvitation) {
      await transaction.adminUser.deleteMany({ where: { email: invitation.normalizedEmail, status: "INVITED" } });
    }
    await transaction.auditLog.create({ data: { actorId: admin.user.id, action: "invitation.revoked", entityType: "UserInvitation", entityId: id, metadata: { email: invitation.normalizedEmail, requestId: event.context.requestId } } });
  });
  return apiData({ revoked: true });
});
