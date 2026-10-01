import { apiData, apiError } from "../../../../utils/api-response";
import { requireCsrf, requirePermission } from "../../../../utils/admin-auth";
import { useDatabase } from "../../../../utils/db";
import { assertDelegablePermissions } from "../../../../services/access-control";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");
  let admin;
  try {
    await requireCsrf(event);
    admin = await requirePermission(event, "roles.update");
  } catch (error) {
    const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 401;
    return apiError(event, status, { code: status === 403 ? "PERMISSION_DENIED" : "AUTH_REQUIRED", message: status === 403 ? "Request rejected." : "Authentication required." });
  }
  const roleId = getRouterParam(event, "id");
  if (!roleId) return apiError(event, 400, { code: "VALIDATION_ERROR", message: "Role id is required." });
  try {
    await useDatabase().$transaction(async (transaction) => {
      const role = await transaction.role.findUnique({ where: { id: roleId }, include: { permissions: true, _count: { select: { users: true } } } });
      if (!role) throw createError({ statusCode: 404, statusMessage: "Role not found." });
      if (role.isProtected || role.isSystem) throw createError({ statusCode: 403, statusMessage: "System roles cannot be deleted." });
      if (role._count.users > 0) throw createError({ statusCode: 409, statusMessage: "Remove this role from every user before deleting it." });
      assertDelegablePermissions(admin.permissions, role.permissions.map(({ permissionKey }) => permissionKey));
      await transaction.role.delete({ where: { id: roleId } });
      await transaction.auditLog.create({ data: { actorId: admin.user.id, action: "role.deleted", entityType: "Role", entityId: roleId, metadata: { key: role.key, requestId: event.context.requestId } } });
    });
    return apiData({ deleted: true });
  } catch (error) {
    const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 500;
    if ([403, 404, 409].includes(status)) return apiError(event, status, { code: status === 409 ? "ROLE_IN_USE" : status === 404 ? "NOT_FOUND" : "DELEGATION_DENIED", message: error instanceof Error ? error.message : "Role deletion rejected." });
    throw error;
  }
});
