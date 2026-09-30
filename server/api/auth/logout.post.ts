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
        : 500;
    if (status === 401) await clearUserSession(event);
    return apiError(event, status, {
      code: status === 403 ? "CSRF_REJECTED" : "AUTH_REQUIRED",
      message: status === 403 ? "Request rejected." : "Authentication required.",
    });
  }
});
