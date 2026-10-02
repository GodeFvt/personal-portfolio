import { AdminUserStatus } from "~~/generated/prisma/client";
import { HttpStatus } from "~~/server/utils/http-status";
import { ApiErrorCode } from "~~/shared/schemas/api";
import { apiData, apiError } from "../../../../../utils/api-response";
import { requireCsrf, requirePermission } from "../../../../../utils/admin-auth";
import { useDatabase } from "../../../../../utils/db";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");
  let admin;
  try {
    await requireCsrf(event);
    admin = await requirePermission(event, "users.invite");
  } catch (error) {
    const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : HttpStatus.UNAUTHORIZED;
    return apiError(event, status, { code: status === HttpStatus.FORBIDDEN ? ApiErrorCode.PERMISSION_DENIED : ApiErrorCode.AUTH_REQUIRED, message: status === HttpStatus.FORBIDDEN ? "Permission denied." : "Authentication required." });
  }
  const id = getRouterParam(event, "id");
  if (!id) return apiError(event, HttpStatus.BAD_REQUEST, { code: ApiErrorCode.VALIDATION_ERROR, message: "Invitation id is required." });
  const invitation = await useDatabase().userInvitation.findUnique({ where: { id } });
  if (!invitation || invitation.acceptedAt) return apiError(event, HttpStatus.NOT_FOUND, { code: ApiErrorCode.NOT_FOUND, message: "Invitation not found." });
  await useDatabase().$transaction(async (transaction) => {
    await transaction.userInvitation.delete({ where: { id } });
    const otherInvitation = await transaction.userInvitation.findFirst({
      where: { normalizedEmail: invitation.normalizedEmail, acceptedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    if (!otherInvitation) {
      await transaction.adminUser.deleteMany({ where: { email: invitation.normalizedEmail, status: AdminUserStatus.INVITED } });
    }
    await transaction.auditLog.create({ data: { actorId: admin.user.id, action: "invitation.revoked", entityType: "UserInvitation", entityId: id, metadata: { email: invitation.normalizedEmail, requestId: event.context.requestId } } });
  });
  return apiData({ revoked: true });
});
