import { availableMediaProviders } from "../../../storage";
import { apiData, apiError } from "../../../utils/api-response";
import { requirePermission } from "../../../utils/admin-auth";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "private, no-store");
  try {
    await requirePermission(event, "content.read");
  } catch (error) {
    const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 401;
    return apiError(event, status, { code: status === 403 ? "PERMISSION_DENIED" : "AUTH_REQUIRED", message: status === 403 ? "Permission denied." : "Authentication required." });
  }
  return apiData({ providers: availableMediaProviders() });
});
