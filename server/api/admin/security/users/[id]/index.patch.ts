import { updateAdminUserSchema } from "~~/shared/schemas/admin-security";
import { ApiErrorCode } from "~~/shared/schemas/api";
import { updateAdminUserAccess } from "../../../../../services/admin-users";
import { apiAuthorizationError, apiData, apiError, apiErrorFromException } from "../../../../../utils/api-response";
import { requireCsrf, requirePermission } from "../../../../../utils/admin-auth";
import { HttpStatus } from "../../../../../utils/http-status";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");

  let admin;
  try {
    await requireCsrf(event);
    admin = await requirePermission(event, "users.manage");
    if (!admin.permissions.has("roles.assign")) {
      return apiError(event, HttpStatus.FORBIDDEN, {
        code: ApiErrorCode.PERMISSION_DENIED,
        message: "Permission denied.",
      });
    }
  } catch (error) {
    return apiAuthorizationError(event, error);
  }

  const userId = getRouterParam(event, "id");
  const parsed = updateAdminUserSchema.safeParse(await readBody(event));
  if (!userId || !parsed.success) {
    return apiError(event, HttpStatus.BAD_REQUEST, {
      code: ApiErrorCode.VALIDATION_ERROR,
      message: "Please check the submitted fields.",
    });
  }

  try {
    const user = await updateAdminUserAccess(userId, parsed.data, {
      actorId: admin.user.id,
      actorPermissions: admin.permissions,
      requestId: event.context.requestId,
    });
    return apiData({ user });
  } catch (error) {
    return apiErrorFromException(event, error);
  }
});
