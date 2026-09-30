import { createHash, timingSafeEqual } from "node:crypto";
import type { H3Event } from "h3";
import { createError, getHeader, getRequestIP } from "h3";
import type { Prisma } from "~~/generated/prisma/client";
import type { PermissionKey } from "../auth/permissions";
import { useDatabase } from "./db";
import { getServerEnv } from "./env";

const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LIMIT = 5;

export function normalizeAdminEmail(email: string) {
  return email.trim().toLowerCase();
}

export function sessionExpiry() {
  return new Date(Date.now() + SESSION_MAX_AGE_MS);
}

export function assertSameOrigin(event: H3Event) {
  const origin = getHeader(event, "origin");
  const expectedOrigin = new URL(getServerEnv().NUXT_PUBLIC_SITE_URL).origin;
  if (!origin || origin !== expectedOrigin) {
    throw createError({ statusCode: 403, statusMessage: "Invalid request origin." });
  }
}

function safeTokenEqual(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

export async function requireAdmin(event: H3Event) {
  const cookieSession = await getUserSession(event);
  const sessionId = cookieSession.secure?.sessionId;
  if (!cookieSession.user?.id || !sessionId) {
    throw createError({ statusCode: 401, statusMessage: "Authentication required." });
  }

  const db = useDatabase();
  const session = await db.adminSession.findUnique({
    where: { id: sessionId },
    include: {
      user: {
        include: {
          roles: {
            include: { role: { include: { permissions: true } } },
          },
        },
      },
    },
  });

  const valid =
    session &&
    session.userId === cookieSession.user.id &&
    !session.revokedAt &&
    session.expiresAt.getTime() > Date.now() &&
    session.user.status === "ACTIVE" &&
    session.user.sessionVersion === cookieSession.secure?.sessionVersion;

  if (!valid) {
    await clearUserSession(event);
    throw createError({ statusCode: 401, statusMessage: "Authentication required." });
  }

  const permissions = new Set<PermissionKey>();
  for (const assignment of session.user.roles) {
    for (const permission of assignment.role.permissions) {
      permissions.add(permission.permissionKey as PermissionKey);
    }
  }

  return { session, user: session.user, permissions };
}

export async function requirePermission(event: H3Event, permission: PermissionKey) {
  const admin = await requireAdmin(event);
  if (!admin.permissions.has(permission)) {
    throw createError({ statusCode: 403, statusMessage: "Permission denied." });
  }
  return admin;
}

export function requireFreshAuthentication(
  admin: Awaited<ReturnType<typeof requireAdmin>>,
  maxAgeMs = 5 * 60 * 1000,
) {
  if (Date.now() - admin.session.authenticatedAt.getTime() > maxAgeMs) {
    throw createError({ statusCode: 403, statusMessage: "Fresh authentication required." });
  }
}

export async function requireCsrf(event: H3Event) {
  assertSameOrigin(event);
  const cookieSession = await getUserSession(event);
  const received = getHeader(event, "x-csrf-token");
  if (!received || !cookieSession.csrfToken || !safeTokenEqual(received, cookieSession.csrfToken)) {
    throw createError({ statusCode: 403, statusMessage: "Invalid CSRF token." });
  }
}

function loginAttemptKey(event: H3Event, normalizedEmail: string) {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? "unknown";
  return createHash("sha256").update(`${normalizedEmail}|${ip}`).digest("hex");
}

export async function reserveLoginAttempt(event: H3Event, normalizedEmail: string) {
  const db = useDatabase();
  const keyHash = loginAttemptKey(event, normalizedEmail);
  const since = new Date(Date.now() - LOGIN_WINDOW_MS);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.$transaction(
        async (transaction) => {
          const failures = await transaction.loginAttempt.count({
            where: { keyHash, succeeded: false, createdAt: { gte: since } },
          });
          if (failures >= LOGIN_LIMIT) {
            throw createError({ statusCode: 429, statusMessage: "Please try again later." });
          }
          return transaction.loginAttempt.create({ data: { keyHash } });
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      if (
        attempt < 2 &&
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2034"
      ) {
        continue;
      }
      throw error;
    }
  }
  throw createError({ statusCode: 429, statusMessage: "Please try again later." });
}

export async function writeAuditLog(input: {
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return useDatabase().auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata ?? {},
    },
  });
}
