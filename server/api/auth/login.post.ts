import { AdminUserStatus } from "~~/generated/prisma/client";
import { HttpStatus } from "~~/server/utils/http-status";
import { ApiErrorCode } from "~~/shared/schemas/api";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { apiData, apiError } from "../../utils/api-response";
import {
  assertSameOrigin,
  normalizeAdminEmail,
  reserveLoginAttempt,
  sessionExpiry,
} from "../../utils/admin-auth";
import {
  adminPasswordNeedsRehash,
  hashAdminPassword,
  verifyAdminPassword,
} from "../../utils/password";
import { useDatabase } from "../../utils/db";

const loginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(128),
});

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");
  try {
    assertSameOrigin(event);
  } catch {
    return apiError(event, HttpStatus.FORBIDDEN, { code: ApiErrorCode.CSRF_REJECTED, message: "Request rejected." });
  }

  const parsed = loginSchema.safeParse(await readBody(event));
  if (!parsed.success) {
    return apiError(event, HttpStatus.BAD_REQUEST, {
      code: ApiErrorCode.VALIDATION_ERROR,
      message: "Please check the submitted fields.",
    });
  }

  const db = useDatabase();
  const email = normalizeAdminEmail(parsed.data.email);
  let loginAttempt;
  try {
    loginAttempt = await reserveLoginAttempt(event, email);
  } catch (error) {
    if (typeof error === "object" && error !== null && "statusCode" in error && error.statusCode === HttpStatus.TOO_MANY_REQUESTS) {
      return apiError(event, HttpStatus.TOO_MANY_REQUESTS, { code: ApiErrorCode.RATE_LIMITED, message: "Please try again later." });
    }
    throw error;
  }

  const account = await db.adminUser.findUnique({ where: { email } });
  const passwordValid = Boolean(
    account?.passwordHash &&
      (await verifyAdminPassword(account.passwordHash, parsed.data.password)),
  );

  if (!account || !passwordValid || account.status !== AdminUserStatus.ACTIVE) {
    await db.auditLog.create({
      data: {
        actorId: account?.id,
        action: "login.failure",
        entityType: "AdminUser",
        entityId: account?.id,
        metadata: { requestId: event.context.requestId },
      },
    });
    return apiError(event, HttpStatus.UNAUTHORIZED, {
      code: ApiErrorCode.INVALID_CREDENTIALS,
      message: "Email or password is incorrect.",
    });
  }

  const authenticatedAt = new Date();
  const session = await db.$transaction(async (transaction) => {
    await transaction.loginAttempt.update({
      where: { id: loginAttempt.id },
      data: { succeeded: true },
    });
    if (
      account.passwordHash &&
      adminPasswordNeedsRehash(account.passwordHash)
    ) {
      await transaction.adminUser.update({
        where: { id: account.id },
        data: { passwordHash: await hashAdminPassword(parsed.data.password) },
      });
    }
    const created = await transaction.adminSession.create({
      data: {
        userId: account.id,
        authMethod: "password",
        authenticatedAt,
        expiresAt: sessionExpiry(),
      },
    });
    await transaction.auditLog.create({
      data: {
        actorId: account.id,
        action: "login.success",
        entityType: "AdminSession",
        entityId: created.id,
        metadata: { authMethod: "password", requestId: event.context.requestId },
      },
    });
    return created;
  });

  const csrfToken = randomBytes(32).toString("base64url");
  await replaceUserSession(event, {
    user: { id: account.id, email: account.email },
    secure: { sessionId: session.id, sessionVersion: account.sessionVersion },
    csrfToken,
    loggedInAt: authenticatedAt.getTime(),
  });

  return apiData({ user: { id: account.id, email: account.email }, csrfToken });
});
