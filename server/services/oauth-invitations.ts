import { HttpStatus } from "../utils/http-status";
import { createHash } from "node:crypto";
import { createError } from "h3";
import { AdminUserStatus, type Prisma } from "../../generated/prisma/client";
import type { OAuthIdentityResult } from "./oauth-adapters";
import { assertInvitationIdentity } from "../../shared/auth/oauth-invitations";
import { sessionExpiry } from "../utils/admin-auth";
import { useDatabase } from "../utils/db";

export function invitationTokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function loadOpenInvitation(token: string) {
  const invitation = await useDatabase().userInvitation.findUnique({
    where: { tokenHash: invitationTokenHash(token) },
    select: { id: true, normalizedEmail: true, acceptedAt: true, expiresAt: true },
  });
  if (!invitation || invitation.acceptedAt || invitation.expiresAt.getTime() <= Date.now()) {
    throw createError({ statusCode: HttpStatus.GONE, statusMessage: "This invitation is invalid or has expired." });
  }
  return invitation;
}

export async function acceptOAuthInvitation(
  transaction: Prisma.TransactionClient,
  input: {
    invitationId: string;
    providerId: string;
    providerKey: string;
    identity: OAuthIdentityResult;
    authenticatedAt: Date;
    requestId?: string;
  },
) {
  const invitation = await transaction.userInvitation.findUnique({ where: { id: input.invitationId } });
  if (!invitation || invitation.acceptedAt || invitation.expiresAt.getTime() <= Date.now()) {
    throw createError({ statusCode: HttpStatus.GONE, statusMessage: "This invitation is invalid or has expired." });
  }
  try { assertInvitationIdentity(invitation.normalizedEmail, input.identity); }
  catch (error) { throw createError({ statusCode: HttpStatus.FORBIDDEN, statusMessage: error instanceof Error ? error.message : "Invitation email verification failed." }); }

  const roleKeys = Array.isArray(invitation.intendedRoles)
    ? invitation.intendedRoles.filter((value): value is string => typeof value === "string")
    : [];
  const uniqueRoleKeys = [...new Set(roleKeys)];
  const roles = await transaction.role.findMany({ where: { key: { in: uniqueRoleKeys } } });
  if (!uniqueRoleKeys.length || roles.length !== uniqueRoleKeys.length) {
    throw createError({ statusCode: HttpStatus.CONFLICT, statusMessage: "The invitation roles are no longer available. Ask an administrator for a new invitation." });
  }

  const existingIdentity = await transaction.oAuthIdentity.findUnique({
    where: { providerId_issuer_subject: { providerId: input.providerId, issuer: input.identity.issuer, subject: input.identity.subject } },
  });
  if (existingIdentity) {
    throw createError({ statusCode: HttpStatus.CONFLICT, statusMessage: "This provider identity is already linked." });
  }

  const existingUser = await transaction.adminUser.findUnique({ where: { email: invitation.normalizedEmail } });
  if (existingUser && existingUser.status !== AdminUserStatus.INVITED) {
    throw createError({ statusCode: HttpStatus.CONFLICT, statusMessage: "This invitation has already been used." });
  }

  const user = existingUser
    ? await transaction.adminUser.update({
        where: { id: existingUser.id },
        data: {
          passwordHash: null,
          status: AdminUserStatus.ACTIVE,
          emailVerifiedAt: input.authenticatedAt,
          sessionVersion: { increment: 1 },
          authorizationVersion: { increment: 1 },
          version: { increment: 1 },
        },
      })
    : await transaction.adminUser.create({
        data: { email: invitation.normalizedEmail, passwordHash: null, status: AdminUserStatus.ACTIVE, emailVerifiedAt: input.authenticatedAt },
      });

  const providerAlreadyLinked = await transaction.oAuthIdentity.findFirst({
    where: { userId: user.id, providerId: input.providerId },
  });
  if (providerAlreadyLinked) {
    throw createError({ statusCode: HttpStatus.CONFLICT, statusMessage: "This account already has a login for that provider." });
  }

  const claimed = await transaction.userInvitation.updateMany({
    where: { id: invitation.id, acceptedAt: null, expiresAt: { gt: input.authenticatedAt } },
    data: { acceptedAt: input.authenticatedAt },
  });
  if (claimed.count !== 1) {
    throw createError({ statusCode: HttpStatus.CONFLICT, statusMessage: "This invitation has already been used." });
  }

  await transaction.userRole.deleteMany({ where: { userId: user.id } });
  await transaction.userRole.createMany({
    data: roles.map((role) => ({ userId: user.id, roleId: role.id, assignedBy: invitation.invitedById })),
  });
  const linkedIdentity = await transaction.oAuthIdentity.create({
    data: {
      userId: user.id,
      providerId: input.providerId,
      issuer: input.identity.issuer,
      subject: input.identity.subject,
      displayEmail: input.identity.email,
    },
  });
  const session = await transaction.adminSession.create({
    data: {
      userId: user.id,
      providerId: input.providerId,
      authMethod: "oauth",
      authenticatedAt: input.authenticatedAt,
      expiresAt: sessionExpiry(),
    },
  });

  await transaction.auditLog.createMany({ data: [
    { actorId: user.id, action: "invitation.accepted", entityType: "UserInvitation", entityId: invitation.id, metadata: { roleKeys: uniqueRoleKeys, authMethod: "oauth", providerKey: input.providerKey, requestId: input.requestId ?? null } },
    { actorId: user.id, action: "oauth.identity.linked", entityType: "OAuthIdentity", entityId: linkedIdentity.id, metadata: { providerKey: input.providerKey, requestId: input.requestId ?? null } },
    { actorId: user.id, action: "login.success", entityType: "AdminSession", entityId: session.id, metadata: { authMethod: "oauth", providerKey: input.providerKey, requestId: input.requestId ?? null } },
  ] });

  return { session, user, authenticatedAt: input.authenticatedAt };
}
