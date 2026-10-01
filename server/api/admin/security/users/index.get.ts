import { paginationQuerySchema } from "~~/shared/schemas/api";
import { apiError, apiPage, paginationMeta } from "../../../../utils/api-response";
import { requirePermission } from "../../../../utils/admin-auth";
import { useDatabase } from "../../../../utils/db";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");
  try { await requirePermission(event, "users.read"); }
  catch (error) {
    const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 401;
    return apiError(event, status, { code: status === 403 ? "PERMISSION_DENIED" : "AUTH_REQUIRED", message: status === 403 ? "Permission denied." : "Authentication required." });
  }
  const parsed = paginationQuerySchema.safeParse(getQuery(event));
  if (!parsed.success) return apiError(event, 400, { code: "VALIDATION_ERROR", message: "Invalid pagination." });
  const { page, perPage } = parsed.data;
  const db = useDatabase();
  const [items, total, invitations] = await Promise.all([
    db.adminUser.findMany({
      skip: (page - 1) * perPage,
      take: perPage,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true, email: true, status: true, emailVerifiedAt: true, version: true, createdAt: true, updatedAt: true,
        roles: { select: { role: { select: { id: true, key: true, name: true } } } },
        oauthIdentities: { select: { id: true, displayEmail: true, provider: { select: { key: true, label: true } } } },
        _count: { select: { sessions: true } },
      },
    }),
    db.adminUser.count(),
    db.userInvitation.findMany({
      where: { acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { id: true, normalizedEmail: true, intendedRoles: true, expiresAt: true, createdAt: true, invitedBy: { select: { email: true } } },
    }),
  ]);
  return apiPage(items, paginationMeta(page, perPage, total), { invitations });
});
