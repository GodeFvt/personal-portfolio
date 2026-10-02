import { HttpStatus } from "~~/server/utils/http-status";
import { ApiErrorCode } from "~~/shared/schemas/api";
import { apiData, apiError } from "../../../../../utils/api-response";
import { requireCsrf, requirePermission } from "../../../../../utils/admin-auth";
import { useDatabase } from "../../../../../utils/db";
import { assertDelegablePermissions } from "../../../../../services/access-control";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");
  let admin;
  try {
    await requireCsrf(event);
    admin = await requirePermission(event, "roles.update");
  } catch (error) {
    const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : HttpStatus.UNAUTHORIZED;
    return apiError(event, status, { code: status === HttpStatus.FORBIDDEN ? ApiErrorCode.PERMISSION_DENIED : ApiErrorCode.AUTH_REQUIRED, message: status === HttpStatus.FORBIDDEN ? "Request rejected." : "Authentication required." });
  }
  const roleId = getRouterParam(event, "id");
  if (!roleId) return apiError(event, HttpStatus.BAD_REQUEST, { code: ApiErrorCode.VALIDATION_ERROR, message: "Role id is required." });
  try {
    await useDatabase().$transaction(async (transaction) => {
      const role = await transaction.role.findUnique({ where: { id: roleId }, include: { permissions: true, _count: { select: { users: true } } } });
      if (!role) throw createError({ statusCode: HttpStatus.NOT_FOUND, statusMessage: "Role not found." });
      if (role.isProtected || role.isSystem) throw createError({ statusCode: HttpStatus.FORBIDDEN, statusMessage: "System roles cannot be deleted." });
      if (role._count.users > 0) throw createError({ statusCode: HttpStatus.CONFLICT, statusMessage: "Remove this role from every user before deleting it." });
      assertDelegablePermissions(admin.permissions, role.permissions.map(({ permissionKey }) => permissionKey));
      await transaction.role.delete({ where: { id: roleId } });
      await transaction.auditLog.create({ data: { actorId: admin.user.id, action: "role.deleted", entityType: "Role", entityId: roleId, metadata: { key: role.key, requestId: event.context.requestId } } });
    });
    return apiData({ deleted: true });
  } catch (error) {
    const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : HttpStatus.INTERNAL_SERVER_ERROR;
    if (([HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND, HttpStatus.CONFLICT] as number[]).includes(status)) return apiError(event, status, { code: status === HttpStatus.CONFLICT ? ApiErrorCode.ROLE_IN_USE : status === HttpStatus.NOT_FOUND ? ApiErrorCode.NOT_FOUND : ApiErrorCode.DELEGATION_DENIED, message: error instanceof Error ? error.message : "Role deletion rejected." });
    throw error;
  }
});
