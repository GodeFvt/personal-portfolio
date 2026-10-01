import { randomUUID } from "node:crypto";
import type { Prisma } from "~~/generated/prisma/client";
import { saveContentDraftSchema } from "~~/shared/schemas/admin-content";
import { apiData, apiError } from "../../../utils/api-response";
import { requireCsrf, requirePermission } from "../../../utils/admin-auth";
import { useDatabase } from "../../../utils/db";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "private, no-store");
  let admin;
  try {
    await requireCsrf(event);
    admin = await requirePermission(event, "content.write");
  } catch (error) {
    const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 401;
    return apiError(event, status, { code: status === 403 ? "REQUEST_REJECTED" : "AUTH_REQUIRED", message: status === 403 ? "Request rejected." : "Authentication required." });
  }
  const parsed = saveContentDraftSchema.safeParse(await readBody(event));
  if (!parsed.success) return apiError(event, 400, { code: "VALIDATION_ERROR", message: "Please check the submitted fields.", fields: parsed.error.flatten().fieldErrors });
  if (parsed.data.entityType === "SiteSettings") {
    try {
      admin = await requirePermission(event, "settings.write");
    } catch {
      return apiError(event, 403, { code: "PERMISSION_DENIED", message: "Permission denied." });
    }
  }

  const db = useDatabase();
  const entityId = parsed.data.entityId ?? randomUUID();
  const nextVersion = parsed.data.expectedVersion + 1;
  try {
    const revision = await db.$transaction(async (transaction) => {
      if (parsed.data.entityType === "Profile") {
        const current = await transaction.profile.findUnique({ where: { id: entityId } });
        if (!current || current.version !== parsed.data.expectedVersion) throw new Error("VERSION_CONFLICT");
      } else if (parsed.data.entityType === "SiteSettings") {
        const current = await transaction.siteSettings.findUnique({ where: { id: entityId } });
        if (!current || current.version !== parsed.data.expectedVersion) throw new Error("VERSION_CONFLICT");
      } else if (parsed.data.entityType === "Project") {
        const current = await transaction.project.findUnique({ where: { id: entityId } });
        if (current && current.version !== parsed.data.expectedVersion) throw new Error("VERSION_CONFLICT");
        const slugOwner = await transaction.project.findFirst({ where: { slug: parsed.data.snapshot.slug, id: { not: entityId } }, select: { id: true } });
        if (slugOwner) throw new Error("SLUG_CONFLICT");
        if (!current) {
          if (parsed.data.expectedVersion !== 0) throw new Error("VERSION_CONFLICT");
          await transaction.project.create({ data: {
            id: entityId, slug: parsed.data.snapshot.slug, name: parsed.data.snapshot.name,
            category: parsed.data.snapshot.category, period: parsed.data.snapshot.period,
            summary: parsed.data.snapshot.summary, imageAlt: parsed.data.snapshot.imageAlt,
            illustration: parsed.data.snapshot.illustration || null, liveUrl: parsed.data.snapshot.liveUrl || null,
            repoUrl: parsed.data.snapshot.repoUrl || null, coverMediaId: parsed.data.snapshot.coverMediaId,
            featured: parsed.data.snapshot.featured, archived: parsed.data.snapshot.archived,
            sortOrder: parsed.data.snapshot.sortOrder, publicationState: "DRAFT", version: 0,
          } });
        }
      } else if (parsed.data.entityType === "Experience") {
        const current = await transaction.experience.findUnique({ where: { id: entityId } });
        if (current && current.version !== parsed.data.expectedVersion) throw new Error("VERSION_CONFLICT");
        if (!current) {
          if (parsed.data.expectedVersion !== 0) throw new Error("VERSION_CONFLICT");
          await transaction.experience.create({ data: {
            id: entityId, company: parsed.data.snapshot.company, fullCompany: parsed.data.snapshot.fullCompany,
            role: parsed.data.snapshot.role, period: parsed.data.snapshot.period,
            description: parsed.data.snapshot.description, sortOrder: parsed.data.snapshot.sortOrder,
            publicationState: "DRAFT", version: 0,
          } });
        }
      } else if (parsed.data.entityType === "SkillGroup") {
        const current = await transaction.skillGroup.findUnique({ where: { id: entityId } });
        if (current && current.version !== parsed.data.expectedVersion) throw new Error("VERSION_CONFLICT");
        if (!current) {
          if (parsed.data.expectedVersion !== 0) throw new Error("VERSION_CONFLICT");
          await transaction.skillGroup.create({ data: { id: entityId, label: parsed.data.snapshot.label, icon: parsed.data.snapshot.icon, sortOrder: parsed.data.snapshot.sortOrder, version: 0 } });
        }
      }
      const saved = await transaction.contentRevision.upsert({
        where: { entityType_entityId_version: { entityType: parsed.data.entityType, entityId, version: nextVersion } },
        update: { snapshot: parsed.data.snapshot as Prisma.InputJsonValue, authorId: admin.user.id, publishedAt: null },
        create: { entityType: parsed.data.entityType, entityId, version: nextVersion, snapshot: parsed.data.snapshot as Prisma.InputJsonValue, authorId: admin.user.id },
      });
      await transaction.auditLog.create({ data: { actorId: admin.user.id, action: "content.draft.saved", entityType: parsed.data.entityType, entityId, metadata: { version: nextVersion, requestId: event.context.requestId } } });
      return saved;
    });
    return apiData({ revision });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "VERSION_CONFLICT" || message === "SLUG_CONFLICT" || (typeof error === "object" && error && "code" in error && error.code === "P2002")) {
      return apiError(event, 409, { code: message === "SLUG_CONFLICT" ? "SLUG_CONFLICT" : "VERSION_CONFLICT", message: message === "SLUG_CONFLICT" ? "This slug is already used." : "This content changed. Reload before saving again." });
    }
    throw error;
  }
});
