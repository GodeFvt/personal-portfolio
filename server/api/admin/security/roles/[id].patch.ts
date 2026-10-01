import { updateRoleSchema } from "~~/shared/schemas/admin-security";
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
  const parsed = updateRoleSchema.safeParse(await readBody(event));
  if (!roleId || !parsed.success) return apiError(event, 400, { code: "VALIDATION_ERROR", message: "Please check the submitted fields." });

  try {
    assertDelegablePermissions(admin.permissions, parsed.data.permissionKeys);
    const role = await useDatabase().$transaction(async (transaction) => {
      const current = await transaction.role.findUnique({ where: { id: roleId }, include: { permissions: true } });
      if (!current) throw createError({ statusCode: 404, statusMessage: "Role not found." });
      if (current.isProtected || current.isSystem) throw createError({ statusCode: 403, statusMessage: "System roles cannot be edited." });
      if (current.version !== parsed.data.expectedVersion) throw createError({ statusCode: 409, statusMessage: "This role changed. Reload before saving." });
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
    const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 500;
    if ([403, 404, 409].includes(status)) return apiError(event, status, { code: status === 409 ? "VERSION_CONFLICT" : status === 404 ? "NOT_FOUND" : "DELEGATION_DENIED", message: error instanceof Error ? error.message : "Role update rejected." });
    throw error;
  }
});
