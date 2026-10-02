import { HttpStatus } from "~~/server/utils/http-status";
import { ApiErrorCode } from "~~/shared/schemas/api";
import { apiData, apiError } from "../../utils/api-response";
import { requireAdmin, requireCsrf } from "../../utils/admin-auth";
import { useDatabase } from "../../utils/db";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");
  try {
    await requireCsrf(event);
    const admin = await requireAdmin(event);
    await useDatabase().$transaction([
      useDatabase().adminSession.update({
        where: { id: admin.session.id },
        data: { revokedAt: new Date() },
      }),
      useDatabase().auditLog.create({
        data: {
          actorId: admin.user.id,
          action: "logout",
          entityType: "AdminSession",
          entityId: admin.session.id,
          metadata: { requestId: event.context.requestId },
        },
      }),
    ]);
    await clearUserSession(event);
    return apiData({ loggedOut: true });
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : HttpStatus.INTERNAL_SERVER_ERROR;
    if (status === HttpStatus.UNAUTHORIZED) await clearUserSession(event);
    return apiError(event, status, {
      code: status === HttpStatus.FORBIDDEN ? ApiErrorCode.CSRF_REJECTED : ApiErrorCode.AUTH_REQUIRED,
      message: status === HttpStatus.FORBIDDEN ? "Request rejected." : "Authentication required.",
    });
  }
});
