import { apiData, apiError } from "../../../utils/api-response";
import { requirePermission } from "../../../utils/admin-auth";
import { useDatabase } from "../../../utils/db";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");
  try {
    await requirePermission(event, "content.read");
  } catch (error) {
    const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 401;
    return apiError(event, status, { code: status === 403 ? "PERMISSION_DENIED" : "AUTH_REQUIRED", message: status === 403 ? "Permission denied." : "Authentication required." });
  }

  const groups = await useDatabase().navigationGroup.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: {
      tabs: {
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        include: { blocks: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] } },
      },
    },
  });
  const revisions = await useDatabase().contentRevision.findMany({
    where: { entityType: { in: ["NavigationGroup", "PortfolioTab"] }, publishedAt: null },
    orderBy: [{ createdAt: "desc" }],
    select: { id: true, entityType: true, entityId: true, version: true, snapshot: true, createdAt: true },
  });
  return apiData({ groups, revisions });
});
