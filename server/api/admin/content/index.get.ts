import { NavigationVisibility, PublicationState } from "~~/generated/prisma/client";
import { HttpStatus } from "~~/server/utils/http-status";
import { ApiErrorCode } from "~~/shared/schemas/api";
import { apiData, apiError } from "../../../utils/api-response";
import { requirePermission } from "../../../utils/admin-auth";
import { useDatabase } from "../../../utils/db";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "private, no-store");
  try {
    await requirePermission(event, "content.read");
  } catch (error) {
    const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : HttpStatus.UNAUTHORIZED;
    return apiError(event, status, { code: status === HttpStatus.FORBIDDEN ? ApiErrorCode.PERMISSION_DENIED : ApiErrorCode.AUTH_REQUIRED, message: status === HttpStatus.FORBIDDEN ? "Permission denied." : "Authentication required." });
  }

  const db = useDatabase();
  const [profile, projects, experiences, skillGroups, settings, tabs, revisions] = await Promise.all([
    db.profile.findFirst({ include: { education: { orderBy: { sortOrder: "asc" } }, socialLinks: { orderBy: { sortOrder: "asc" } } } }),
    db.project.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }], include: { highlights: { orderBy: { sortOrder: "asc" } }, technologies: { orderBy: { sortOrder: "asc" } } } }),
    db.experience.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }], include: { details: { orderBy: { sortOrder: "asc" } }, technologies: { orderBy: { sortOrder: "asc" } } } }),
    db.skillGroup.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }], include: { technologies: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] } } }),
    db.siteSettings.findFirst(),
    db.portfolioTab.findMany({ where: { publicationState: PublicationState.PUBLISHED, group: { visibility: NavigationVisibility.VISIBLE } }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { id: true, label: true, slug: true } }),
    db.contentRevision.findMany({
      where: { entityType: { in: ["Profile", "Project", "Experience", "SkillGroup", "SiteSettings"] }, publishedAt: null },
      orderBy: [{ createdAt: "desc" }],
      select: { id: true, entityType: true, entityId: true, version: true, snapshot: true, createdAt: true },
    }),
  ]);
  return apiData({ profile, projects, experiences, skillGroups, settings, tabs, revisions });
});
