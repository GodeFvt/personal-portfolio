import { apiData, apiError } from "../../../../utils/api-response";
import { requirePermission } from "../../../../utils/admin-auth";
import { useDatabase } from "../../../../utils/db";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");
  try { await requirePermission(event, "auth.providers.read"); }
  catch (error) {
    const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 401;
    return apiError(event, status, { code: status === 403 ? "PERMISSION_DENIED" : "AUTH_REQUIRED", message: status === 403 ? "Permission denied." : "Authentication required." });
  }
  const providers = await useDatabase().oAuthProvider.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: {
      id: true, key: true, type: true, label: true, enabled: true, sortOrder: true,
      activeConfigVersion: true, draftConfigVersion: true, version: true,
      configs: {
        orderBy: { configVersion: "desc" }, take: 1,
        select: { configVersion: true, clientId: true, encryptedSecret: true, testedAt: true, updatedAt: true },
      },
    },
  });
  return apiData({ providers: providers.map((provider) => ({
    ...provider,
    configs: undefined,
    latestConfig: provider.configs[0] ? {
      configVersion: provider.configs[0].configVersion,
      clientId: provider.configs[0].clientId,
      secretConfigured: Boolean(provider.configs[0].encryptedSecret),
      testedAt: provider.configs[0].testedAt,
      updatedAt: provider.configs[0].updatedAt,
    } : null,
  })) });
});
