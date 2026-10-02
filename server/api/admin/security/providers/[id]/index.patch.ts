import { HttpStatus } from "~~/server/utils/http-status";
import { ApiErrorCode } from "~~/shared/schemas/api";
import type { Prisma } from "~~/generated/prisma/client";
import { providerDraftSchema } from "~~/shared/schemas/admin-security";
import { apiData, apiError } from "../../../../../utils/api-response";
import { requireCsrf, requireFreshAuthentication, requirePermission } from "../../../../../utils/admin-auth";
import { useDatabase } from "../../../../../utils/db";
import { encryptSecret } from "../../../../../utils/secret-encryption";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");
  let admin;
  try {
    await requireCsrf(event);
    admin = await requirePermission(event, "auth.providers.manage");
    requireFreshAuthentication(admin);
  } catch (error) {
    const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : HttpStatus.UNAUTHORIZED;
    return apiError(event, status, { code: status === HttpStatus.FORBIDDEN ? ApiErrorCode.REAUTH_REQUIRED : ApiErrorCode.AUTH_REQUIRED, message: status === HttpStatus.FORBIDDEN ? "Sign in again before changing login methods." : "Authentication required." });
  }
  const providerId = getRouterParam(event, "id");
  const parsed = providerDraftSchema.safeParse(await readBody(event));
  if (!providerId || !parsed.success) return apiError(event, HttpStatus.BAD_REQUEST, { code: ApiErrorCode.VALIDATION_ERROR, message: "Please check the submitted fields." });

  const db = useDatabase();
  const provider = await db.oAuthProvider.findUnique({
    where: { id: providerId },
    include: { configs: { orderBy: { configVersion: "desc" }, take: 1 } },
  });
  if (!provider) return apiError(event, HttpStatus.NOT_FOUND, { code: ApiErrorCode.NOT_FOUND, message: "Login provider not found." });
  if (provider.version !== parsed.data.expectedVersion) return apiError(event, HttpStatus.CONFLICT, { code: ApiErrorCode.VERSION_CONFLICT, message: "This provider changed. Reload before saving." });
  if (parsed.data.options.type !== provider.type) return apiError(event, HttpStatus.BAD_REQUEST, { code: ApiErrorCode.VALIDATION_ERROR, message: "Provider type cannot be changed." });

  let encryptedSecret = provider.configs[0]?.encryptedSecret;
  let keyVersion = provider.configs[0]?.keyVersion;
  if (parsed.data.clientSecret) {
    try {
      const encrypted = encryptSecret(parsed.data.clientSecret);
      encryptedSecret = encrypted.ciphertext;
      keyVersion = encrypted.keyVersion;
    } catch {
      return apiError(event, HttpStatus.SERVICE_UNAVAILABLE, { code: ApiErrorCode.SECRET_STORAGE_UNAVAILABLE, message: "OAuth secret encryption is not configured." });
    }
  }
  if (!encryptedSecret || !keyVersion) return apiError(event, HttpStatus.BAD_REQUEST, { code: ApiErrorCode.SECRET_REQUIRED, message: "Client secret is required." });
  const configVersion = (provider.configs[0]?.configVersion ?? 0) + 1;

  try {
    const result = await db.$transaction(async (transaction) => {
      const config = await transaction.oAuthProviderConfig.create({
        data: {
          providerId,
          configVersion,
          clientId: parsed.data.clientId,
          encryptedSecret,
          keyVersion,
          validatedConfig: parsed.data.options as Prisma.InputJsonValue,
        },
      });
      const updated = await transaction.oAuthProvider.update({
        where: { id: providerId },
        data: { label: parsed.data.label, sortOrder: parsed.data.sortOrder, draftConfigVersion: configVersion, version: { increment: 1 } },
      });
      await transaction.auditLog.create({
        data: { actorId: admin.user.id, action: "oauth.config.draft.saved", entityType: "OAuthProvider", entityId: providerId, metadata: { configVersion, requestId: event.context.requestId } },
      });
      return { provider: updated, configVersion, secretConfigured: true };
    });
    return apiData(result);
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return apiError(event, HttpStatus.CONFLICT, { code: ApiErrorCode.VERSION_CONFLICT, message: "This provider changed. Reload before saving." });
    throw error;
  }
});
