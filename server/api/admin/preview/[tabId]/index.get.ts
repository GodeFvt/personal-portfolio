import { HttpStatus } from "~~/server/utils/http-status";
import { ApiErrorCode } from "~~/shared/schemas/api";
import { apiData, apiError } from "../../../../utils/api-response";
import { requirePermission } from "../../../../utils/admin-auth";
import { useDatabase } from "../../../../utils/db";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "private, no-store");
  try {
    await requirePermission(event, "content.read");
  } catch (error) {
    const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : HttpStatus.UNAUTHORIZED;
    return apiError(event, status, { code: status === HttpStatus.FORBIDDEN ? ApiErrorCode.PERMISSION_DENIED : ApiErrorCode.AUTH_REQUIRED, message: status === HttpStatus.FORBIDDEN ? "Permission denied." : "Authentication required." });
  }

  const tabId = getRouterParam(event, "tabId");
  if (!tabId) return apiError(event, HttpStatus.BAD_REQUEST, { code: ApiErrorCode.VALIDATION_ERROR, message: "Tab id is required." });
  const [tab, draft] = await Promise.all([
    useDatabase().portfolioTab.findUnique({
      where: { id: tabId },
      include: { blocks: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] } },
    }),
    useDatabase().contentRevision.findFirst({
      where: { entityType: "PortfolioTab", entityId: tabId, publishedAt: null },
      orderBy: { version: "desc" },
    }),
  ]);
  if (!tab) return apiError(event, HttpStatus.NOT_FOUND, { code: ApiErrorCode.NOT_FOUND, message: "Tab not found." });
  return apiData({ tab, draft });
});
