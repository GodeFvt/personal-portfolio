import { HttpStatus } from "~~/server/utils/http-status";
import { ApiErrorCode } from "~~/shared/schemas/api";
import { apiData, apiError } from "../../utils/api-response";
import { requirePermission } from "../../utils/admin-auth";
import { useDatabase } from "../../utils/db";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");
  try {
    await requirePermission(event, "content.read");
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : HttpStatus.UNAUTHORIZED;
    return apiError(event, status, {
      code: status === HttpStatus.FORBIDDEN ? ApiErrorCode.PERMISSION_DENIED : ApiErrorCode.AUTH_REQUIRED,
      message: status === HttpStatus.FORBIDDEN ? "Permission denied." : "Authentication required.",
    });
  }

  const db = useDatabase();
  const [tabs, projects, experiences, users, recentAudit] = await Promise.all([
    db.portfolioTab.groupBy({ by: ["publicationState"], _count: true }),
    db.project.groupBy({ by: ["publicationState"], _count: true }),
    db.experience.groupBy({ by: ["publicationState"], _count: true }),
    db.adminUser.count(),
    db.auditLog.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 8,
      select: { id: true, action: true, entityType: true, createdAt: true },
    }),
  ]);

  return apiData({ tabs, projects, experiences, users, recentAudit });
});
