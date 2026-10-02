import { AdminUserStatus, type PrismaClient } from "../../generated/prisma/client";
import type { PermissionKey } from "../../shared/auth/permissions";
import type { UpdateAdminUserInput } from "../../shared/schemas/admin-security";
import { ApiErrorCode } from "../../shared/schemas/api";
import { AppError } from "../utils/app-error";
import { useDatabase } from "../utils/db";
import { HttpStatus } from "../utils/http-status";
import { assertOwnerChangeAllowed, loadAssignableRoles, OWNER_ROLE_KEY, serializable } from "./access-control";

interface UpdateAdminUserContext {
  actorId: string;
  actorPermissions: Set<PermissionKey>;
  requestId?: string;
}

export async function updateAdminUserAccess(
  userId: string,
  input: UpdateAdminUserInput,
  context: UpdateAdminUserContext,
  db: PrismaClient = useDatabase(),
) {
  if (userId === context.actorId && input.status === AdminUserStatus.SUSPENDED) {
    throw new AppError({
      statusCode: HttpStatus.CONFLICT,
      code: ApiErrorCode.SELF_SUSPEND,
      message: "You cannot suspend your own account.",
    });
  }

  return serializable(async (transaction) => {
    const current = await transaction.adminUser.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });
    if (!current) {
      throw new AppError({ statusCode: HttpStatus.NOT_FOUND, code: ApiErrorCode.NOT_FOUND, message: "User not found." });
    }
    if (current.version !== input.expectedVersion) {
      throw new AppError({
        statusCode: HttpStatus.CONFLICT,
        code: ApiErrorCode.OWNER_OR_VERSION_CONFLICT,
        message: "This user changed. Reload before saving.",
      });
    }

    const uniqueRoleIds = [...new Set(input.roleIds)];
    let roles = await transaction.role.findMany({ where: { id: { in: uniqueRoleIds } } });
    if (roles.length !== uniqueRoleIds.length) {
      throw new AppError({
        statusCode: HttpStatus.BAD_REQUEST,
        code: ApiErrorCode.VALIDATION_ERROR,
        message: "One or more roles do not exist.",
      });
    }

    const targetIsOwner = current.roles.some(({ role }) => role.key === OWNER_ROLE_KEY);
    const nextIsOwner = roles.some((role) => role.key === OWNER_ROLE_KEY);
    if (targetIsOwner && !context.actorPermissions.has("ownership.manage")) {
      throw new AppError({
        statusCode: HttpStatus.FORBIDDEN,
        code: ApiErrorCode.DELEGATION_DENIED,
        message: "Owner accounts are protected.",
      });
    }

    await assertOwnerChangeAllowed(transaction, {
      targetUserId: userId,
      targetIsActiveOwner: current.status === AdminUserStatus.ACTIVE && targetIsOwner,
      nextIsActiveOwner: input.status === AdminUserStatus.ACTIVE && nextIsOwner,
    });

    const currentRoleIds = new Set(current.roles.map(({ roleId }) => roleId));
    const nextRoleIds = new Set(roles.map(({ id }) => id));
    const rolesChanged = currentRoleIds.size !== nextRoleIds.size
      || [...currentRoleIds].some((id) => !nextRoleIds.has(id));
    if (rolesChanged) roles = await loadAssignableRoles(transaction, input.roleIds, context.actorPermissions);

    const suspended = current.status !== AdminUserStatus.SUSPENDED
      && input.status === AdminUserStatus.SUSPENDED;
    if (rolesChanged) {
      await transaction.userRole.deleteMany({ where: { userId } });
      await transaction.userRole.createMany({
        data: roles.map((role) => ({ userId, roleId: role.id, assignedBy: context.actorId })),
      });
    }
    if (suspended) {
      await transaction.adminSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    const updated = await transaction.adminUser.update({
      where: { id: userId },
      data: {
        status: input.status,
        version: { increment: 1 },
        ...(rolesChanged ? { authorizationVersion: { increment: 1 } } : {}),
        ...(suspended ? { sessionVersion: { increment: 1 } } : {}),
      },
      select: {
        id: true,
        email: true,
        status: true,
        version: true,
        roles: { select: { role: { select: { id: true, key: true, name: true } } } },
      },
    });
    await transaction.auditLog.create({
      data: {
        actorId: context.actorId,
        action: "user.access.updated",
        entityType: "AdminUser",
        entityId: userId,
        metadata: {
          previousStatus: current.status,
          status: input.status,
          roleKeys: roles.map(({ key }) => key),
          sessionsRevoked: suspended,
          requestId: context.requestId,
        },
      },
    });
    return updated;
  }, db);
}
