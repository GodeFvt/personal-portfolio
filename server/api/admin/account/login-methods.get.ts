import { apiData, apiError } from "../../../utils/api-response";
import { requireAdmin } from "../../../utils/admin-auth";
import { useDatabase } from "../../../utils/db";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");
  let admin;
  try { admin = await requireAdmin(event); }
  catch { return apiError(event, 401, { code: "AUTH_REQUIRED", message: "Authentication required." }); }

  const [providers, identities] = await Promise.all([
    useDatabase().oAuthProvider.findMany({
      where: { enabled: true, activeConfigVersion: { not: null } },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: { id: true, key: true, type: true, label: true },
    }),
    useDatabase().oAuthIdentity.findMany({
      where: { userId: admin.user.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, displayEmail: true, createdAt: true, provider: { select: { id: true, key: true, label: true, enabled: true } } },
    }),
  ]);
  return apiData({ passwordConfigured: Boolean(admin.user.passwordHash), providers, identities });
});
