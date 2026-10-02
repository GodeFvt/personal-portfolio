import { HttpStatus } from "~~/server/utils/http-status";
import { ApiErrorCode } from "~~/shared/schemas/api";
import { updateRoleSchema } from "~~/shared/schemas/admin-security";
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
  const parsed = updateRoleSchema.safeParse(await readBody(event));
  if (!roleId || !parsed.success) return apiError(event, HttpStatus.BAD_REQUEST, { code: ApiErrorCode.VALIDATION_ERROR, message: "Please check the submitted fields." });

  try {
    assertDelegablePermissions(admin.permissions, parsed.data.permissionKeys);
    const role = await useDatabase().$transaction(async (transaction) => {
      const current = await transaction.role.findUnique({ where: { id: roleId }, include: { permissions: true } });
      if (!current) throw createError({ statusCode: HttpStatus.NOT_FOUND, statusMessage: "Role not found." });
      if (current.isProtected || current.isSystem) throw createError({ statusCode: HttpStatus.FORBIDDEN, statusMessage: "System roles cannot be edited." });
      if (current.version !== parsed.data.expectedVersion) throw createError({ statusCode: HttpStatus.CONFLICT, statusMessage: "This role changed. Reload before saving." });
      assertDelegablePermissions(admin.permissions, current.permissions.map(({ permissionKey }) => permissionKey));
      await transaction.rolePermission.deleteMany({ where: { roleId } });
      const updated = await transaction.role.update({
        where: { id: roleId },
        data: {
          name: parsed.data.name,
          description: parsed.data.description || null,
          version: { increment: 1 },
          permissions: { create: [...new Set(parsed.data.permissionKeys)].map((permissionKey) => ({ permissionKey })) },
        },
        include: { permissions: true, _count: { select: { users: true } } },
      });
      await transaction.adminUser.updateMany({ where: { roles: { some: { roleId } } }, data: { authorizationVersion: { increment: 1 } } });
      await transaction.auditLog.create({ data: { actorId: admin.user.id, action: "role.updated", entityType: "Role", entityId: roleId, metadata: { permissions: parsed.data.permissionKeys, requestId: event.context.requestId } } });
      return updated;
    });
    return apiData({ role });
  } catch (error) {
    const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : HttpStatus.INTERNAL_SERVER_ERROR;
    if (([HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND, HttpStatus.CONFLICT] as number[]).includes(status)) return apiError(event, status, { code: status === HttpStatus.CONFLICT ? ApiErrorCode.VERSION_CONFLICT : status === HttpStatus.NOT_FOUND ? ApiErrorCode.NOT_FOUND : ApiErrorCode.DELEGATION_DENIED, message: error instanceof Error ? error.message : "Role update rejected." });
    throw error;
  }
});
