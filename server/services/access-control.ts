import { AdminUserStatus, type Prisma } from "../../generated/prisma/client";
import type { PermissionKey } from "../../shared/auth/permissions";
import { permissionCatalog } from "../../shared/auth/permissions";
import { ApiErrorCode } from "../../shared/schemas/api";
import { AppError } from "../utils/app-error";
import { HttpStatus } from "../utils/http-status";

export const OWNER_ROLE_KEY = "owner";

export function assertKnownPermissions(permissionKeys: string[]): asserts permissionKeys is PermissionKey[] {
  const known = new Set(Object.keys(permissionCatalog));
  if (permissionKeys.some((key) => !known.has(key))) {
    throw new AppError({ statusCode: HttpStatus.BAD_REQUEST, code: ApiErrorCode.VALIDATION_ERROR, message: "Unknown permission." });
  }
}

export function assertDelegablePermissions(
  actorPermissions: Set<PermissionKey>,
  permissionKeys: string[],
) {
  assertKnownPermissions(permissionKeys);
  if (permissionKeys.some((key) => !actorPermissions.has(key))) {
    throw new AppError({
      statusCode: HttpStatus.FORBIDDEN,
      code: ApiErrorCode.DELEGATION_DENIED,
      message: "A role cannot grant permissions you do not hold.",
    });
  }
}

export async function loadAssignableRoles(
  transaction: Prisma.TransactionClient,
  roleIds: string[],
  actorPermissions: Set<PermissionKey>,
) {
  const uniqueRoleIds = [...new Set(roleIds)];
  const roles = await transaction.role.findMany({
    where: { id: { in: uniqueRoleIds } },
    include: { permissions: true },
  });
  if (roles.length !== uniqueRoleIds.length) {
    throw new AppError({ statusCode: HttpStatus.BAD_REQUEST, code: ApiErrorCode.VALIDATION_ERROR, message: "One or more roles do not exist." });
  }

  for (const role of roles) {
    if (role.key === OWNER_ROLE_KEY && !actorPermissions.has("ownership.manage")) {
      throw new AppError({ statusCode: HttpStatus.FORBIDDEN, code: ApiErrorCode.DELEGATION_DENIED, message: "Owner assignment is protected." });
    }
    assertDelegablePermissions(
      actorPermissions,
      role.permissions.map(({ permissionKey }) => permissionKey),
    );
  }
  return roles;
}

export async function assertOwnerChangeAllowed(
  transaction: Prisma.TransactionClient,
  input: {
    targetUserId: string;
    targetIsActiveOwner: boolean;
    nextIsActiveOwner: boolean;
  },
) {
  if (!input.targetIsActiveOwner || input.nextIsActiveOwner) return;
  const otherActiveOwner = await transaction.adminUser.findFirst({
    where: {
      id: { not: input.targetUserId },
      status: AdminUserStatus.ACTIVE,
      roles: { some: { role: { key: OWNER_ROLE_KEY } } },
    },
    select: { id: true },
  });
  if (!otherActiveOwner) {
    throw new AppError({ statusCode: HttpStatus.CONFLICT, code: ApiErrorCode.OWNER_OR_VERSION_CONFLICT, message: "The last active Owner cannot be removed or suspended." });
  }
}

export async function serializable<T>(work: (transaction: Prisma.TransactionClient) => Promise<T>, db: {
  $transaction: <R>(fn: (transaction: Prisma.TransactionClient) => Promise<R>, options: { isolationLevel: "Serializable" }) => Promise<R>;
}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.$transaction(work, { isolationLevel: "Serializable" });
    } catch (error) {
      if (
        attempt < 2 &&
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2034"
      ) continue;
      throw error;
    }
  }
  throw new AppError({ statusCode: HttpStatus.CONFLICT, code: ApiErrorCode.OWNER_OR_VERSION_CONFLICT, message: "The access policy changed. Please try again." });
}
