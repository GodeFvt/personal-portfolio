import { apiAuthorizationError, apiData } from "~~/server/utils/api-response";
import { requirePermission } from "~~/server/utils/admin-auth";
import { useDatabase } from "~~/server/utils/db";
export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "private, no-store");
  try {
    await requirePermission(event, "content.read");
  } catch (error) {
    return apiAuthorizationError(event, error);
  }
  const db = useDatabase();
  const [pages, revisions] = await Promise.all([
    db.portfolioTab.findMany({
      orderBy: [{ groupId: "asc" }, { sortOrder: "asc" }],
      include: {
        group: { select: { label: true } },
        blocks: { orderBy: { sortOrder: "asc" } },
      },
    }),
    db.contentRevision.findMany({
      where: { entityType: "PortfolioTab", publishedAt: null },
      orderBy: { version: "desc" },
    }),
  ]);
  return apiData({ pages, revisions });
});
