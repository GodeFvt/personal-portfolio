import { apiData, apiError } from "../../../../utils/api-response";
import { requirePermission } from "../../../../utils/admin-auth";
import { useDatabase } from "../../../../utils/db";
import { getServerEnv } from "../../../../utils/env";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");
  let admin;
  try { admin = await requirePermission(event, "auth.providers.read"); }
  catch (error) {
    const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 401;
    return apiError(event, status, { code: status === 403 ? "PERMISSION_DENIED" : "AUTH_REQUIRED", message: status === 403 ? "Permission denied." : "Authentication required." });
  }
  const [providers, currentIdentities] = await Promise.all([useDatabase().oAuthProvider.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: {
      id: true, key: true, type: true, label: true, enabled: true, sortOrder: true,
      activeConfigVersion: true, draftConfigVersion: true, version: true,
      configs: {
        orderBy: { configVersion: "desc" }, take: 1,
        select: { configVersion: true, clientId: true, encryptedSecret: true, validatedConfig: true, testedAt: true, updatedAt: true },
      },
    },
  }), useDatabase().oAuthIdentity.findMany({
    where: { userId: admin.user.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, displayEmail: true, createdAt: true, provider: { select: { id: true, key: true, label: true, enabled: true } } },
  })]);
  return apiData({ providers: providers.map((provider) => ({
    ...provider,
    configs: undefined,
    latestConfig: provider.configs[0] ? {
      configVersion: provider.configs[0].configVersion,
      clientId: provider.configs[0].clientId,
      secretConfigured: Boolean(provider.configs[0].encryptedSecret),
      options: provider.configs[0].validatedConfig,
      testedAt: provider.configs[0].testedAt,
      updatedAt: provider.configs[0].updatedAt,
    } : null,
  })), currentIdentities, callbackBaseUrl: `${getServerEnv().NUXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/api/auth/oauth` });
});
