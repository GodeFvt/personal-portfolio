import { updateAdminUserSchema } from "~~/shared/schemas/admin-security";
import { apiData, apiError } from "../../../../utils/api-response";
import { requireCsrf, requirePermission } from "../../../../utils/admin-auth";
import { useDatabase } from "../../../../utils/db";
import { assertOwnerChangeAllowed, loadAssignableRoles, OWNER_ROLE_KEY, serializable } from "../../../../services/access-control";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");
  let admin;
  try {
    await requireCsrf(event);
    admin = await requirePermission(event, "users.manage");
    if (!admin.permissions.has("roles.assign")) throw createError({ statusCode: 403 });
  } catch (error) {
    const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 401;
    return apiError(event, status, { code: status === 403 ? "PERMISSION_DENIED" : "AUTH_REQUIRED", message: status === 403 ? "Permission denied." : "Authentication required." });
  }
  const userId = getRouterParam(event, "id");
  const parsed = updateAdminUserSchema.safeParse(await readBody(event));
  if (!userId || !parsed.success) return apiError(event, 400, { code: "VALIDATION_ERROR", message: "Please check the submitted fields." });
  if (userId === admin.user.id && parsed.data.status === "SUSPENDED") return apiError(event, 409, { code: "SELF_SUSPEND", message: "You cannot suspend your own account." });

  const db = useDatabase();
  try {
    const user = await serializable(async (transaction) => {
      const current = await transaction.adminUser.findUnique({ where: { id: userId }, include: { roles: { include: { role: true } } } });
      if (!current) throw createError({ statusCode: 404, statusMessage: "User not found." });
      if (current.version !== parsed.data.expectedVersion) throw createError({ statusCode: 409, statusMessage: "This user changed. Reload before saving." });

      const uniqueRoleIds = [...new Set(parsed.data.roleIds)];
      let roles = await transaction.role.findMany({ where: { id: { in: uniqueRoleIds } } });
      if (roles.length !== uniqueRoleIds.length) throw createError({ statusCode: 400, statusMessage: "One or more roles do not exist." });
      const targetIsOwner = current.roles.some(({ role }) => role.key === OWNER_ROLE_KEY);
      const nextIsOwner = roles.some((role) => role.key === OWNER_ROLE_KEY);
      if (targetIsOwner && !admin.permissions.has("ownership.manage")) throw createError({ statusCode: 403, statusMessage: "Owner accounts are protected." });
      await assertOwnerChangeAllowed(transaction, {
        targetUserId: userId,
        targetIsActiveOwner: current.status === "ACTIVE" && targetIsOwner,
        nextIsActiveOwner: parsed.data.status === "ACTIVE" && nextIsOwner,
      });

      const currentRoleIds = new Set(current.roles.map(({ roleId }) => roleId));
      const nextRoleIds = new Set(roles.map(({ id }) => id));
      const rolesChanged = currentRoleIds.size !== nextRoleIds.size || [...currentRoleIds].some((id) => !nextRoleIds.has(id));
      if (rolesChanged) roles = await loadAssignableRoles(transaction, parsed.data.roleIds, admin.permissions);
      const suspended = current.status !== "SUSPENDED" && parsed.data.status === "SUSPENDED";

      if (rolesChanged) {
        await transaction.userRole.deleteMany({ where: { userId } });
        await transaction.userRole.createMany({ data: roles.map((role) => ({ userId, roleId: role.id, assignedBy: admin.user.id })) });
      }
      if (suspended) await transaction.adminSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
      const updated = await transaction.adminUser.update({
        where: { id: userId },
        data: {
          status: parsed.data.status,
          version: { increment: 1 },
          ...(rolesChanged ? { authorizationVersion: { increment: 1 } } : {}),
          ...(suspended ? { sessionVersion: { increment: 1 } } : {}),
        },
        select: { id: true, email: true, status: true, version: true, roles: { select: { role: { select: { id: true, key: true, name: true } } } } },
      });
      await transaction.auditLog.create({ data: { actorId: admin.user.id, action: "user.access.updated", entityType: "AdminUser", entityId: userId, metadata: { previousStatus: current.status, status: parsed.data.status, roleKeys: roles.map(({ key }) => key), sessionsRevoked: suspended, requestId: event.context.requestId } } });
      return updated;
    }, db);
    return apiData({ user });
  } catch (error) {
    const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 500;
    if ([400, 403, 404, 409].includes(status)) return apiError(event, status, { code: status === 409 ? "OWNER_OR_VERSION_CONFLICT" : status === 404 ? "NOT_FOUND" : status === 403 ? "DELEGATION_DENIED" : "VALIDATION_ERROR", message: error instanceof Error ? error.message : "User update rejected." });
    throw error;
  }
});
