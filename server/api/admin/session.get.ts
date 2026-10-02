import { HttpStatus } from "~~/server/utils/http-status";
import { ApiErrorCode } from "~~/shared/schemas/api";
import { apiData, apiError } from "../../utils/api-response";
import { requirePermission } from "../../utils/admin-auth";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");
  try {
    const admin = await requirePermission(event, "admin.access");
    const cookieSession = await getUserSession(event);
    return apiData({
      user: {
        id: admin.user.id,
        email: admin.user.email,
        roles: admin.user.roles.map(({ role }) => ({ key: role.key, name: role.name })),
        permissions: [...admin.permissions].sort(),
      },
      session: {
        id: admin.session.id,
        authenticatedAt: admin.session.authenticatedAt,
        expiresAt: admin.session.expiresAt,
      },
      csrfToken: cookieSession.csrfToken,
    });
  } catch {
    return apiError(event, HttpStatus.UNAUTHORIZED, { code: ApiErrorCode.AUTH_REQUIRED, message: "Authentication required." });
  }
});
