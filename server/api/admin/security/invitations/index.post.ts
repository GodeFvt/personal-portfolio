import { createHash, randomBytes } from "node:crypto";
import { createInvitationSchema } from "~~/shared/schemas/admin-security";
import { apiData, apiError } from "../../../../utils/api-response";
import { normalizeAdminEmail, requireCsrf, requirePermission } from "../../../../utils/admin-auth";
import { useDatabase } from "../../../../utils/db";
import { loadAssignableRoles, serializable } from "../../../../services/access-control";
import { getServerEnv } from "../../../../utils/env";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");
  let admin;
  try {
    await requireCsrf(event);
    admin = await requirePermission(event, "users.invite");
    if (!admin.permissions.has("roles.assign")) throw createError({ statusCode: 403 });
  } catch (error) {
    const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 401;
    return apiError(event, status, { code: status === 403 ? "PERMISSION_DENIED" : "AUTH_REQUIRED", message: status === 403 ? "Permission denied." : "Authentication required." });
  }
  const parsed = createInvitationSchema.safeParse(await readBody(event));
  if (!parsed.success) return apiError(event, 400, { code: "VALIDATION_ERROR", message: "Please check the submitted fields.", fields: parsed.error.flatten().fieldErrors });

  const email = normalizeAdminEmail(parsed.data.email);
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000);
  const db = useDatabase();
  try {
    const invitation = await serializable(async (transaction) => {
      const existing = await transaction.adminUser.findUnique({ where: { email } });
      if (existing && existing.status !== "INVITED") throw createError({ statusCode: 409, statusMessage: "An administrator already uses this email." });
      const roles = await loadAssignableRoles(transaction, parsed.data.roleIds, admin.permissions);
      if (!existing) await transaction.adminUser.create({ data: { email, status: "INVITED" } });
      await transaction.userInvitation.deleteMany({ where: { normalizedEmail: email, acceptedAt: null } });
      const created = await transaction.userInvitation.create({
        data: { normalizedEmail: email, intendedRoles: roles.map(({ key }) => key), tokenHash, expiresAt, invitedById: admin.user.id },
        select: { id: true, normalizedEmail: true, intendedRoles: true, expiresAt: true, createdAt: true },
      });
      await transaction.auditLog.create({ data: { actorId: admin.user.id, action: "invitation.created", entityType: "UserInvitation", entityId: created.id, metadata: { email, roleKeys: roles.map(({ key }) => key), expiresAt: expiresAt.toISOString(), requestId: event.context.requestId } } });
      return created;
    }, db);
    const siteUrl = getServerEnv().NUXT_PUBLIC_SITE_URL.replace(/\/$/, "");
    return apiData({ invitation, acceptUrl: `${siteUrl}/admin/accept-invitation?token=${encodeURIComponent(token)}` });
  } catch (error) {
    const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 500;
    if ([400, 403, 409].includes(status)) return apiError(event, status, { code: status === 409 ? "ACCOUNT_EXISTS" : status === 403 ? "DELEGATION_DENIED" : "VALIDATION_ERROR", message: error instanceof Error ? error.message : "Invitation rejected." });
    throw error;
  }
});
