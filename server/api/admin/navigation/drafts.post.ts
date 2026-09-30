import { randomUUID } from "node:crypto";
import type { Prisma } from "~~/generated/prisma/client";
import { saveNavigationDraftSchema } from "~~/shared/schemas/admin-content";
import { apiData, apiError } from "../../../utils/api-response";
import { requireCsrf, requirePermission } from "../../../utils/admin-auth";
import { useDatabase } from "../../../utils/db";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");
  let admin;
  try {
    await requireCsrf(event);
    admin = await requirePermission(event, "navigation.write");
  } catch (error) {
    const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 401;
    return apiError(event, status, { code: status === 403 ? "REQUEST_REJECTED" : "AUTH_REQUIRED", message: status === 403 ? "Request rejected." : "Authentication required." });
  }

  const parsed = saveNavigationDraftSchema.safeParse(await readBody(event));
  if (!parsed.success) {
    return apiError(event, 400, { code: "VALIDATION_ERROR", message: "Please check the submitted fields.", fields: parsed.error.flatten().fieldErrors });
  }

  const db = useDatabase();
  const entityId = parsed.data.entityId ?? randomUUID();
  const nextVersion = parsed.data.expectedVersion + 1;
  try {
    const revision = await db.$transaction(async (transaction) => {
      if (parsed.data.entityType === "NavigationGroup") {
        const current = await transaction.navigationGroup.findUnique({ where: { id: entityId } });
        if (current && current.version !== parsed.data.expectedVersion) throw new Error("VERSION_CONFLICT");
        if (!current) {
          if (parsed.data.expectedVersion !== 0) throw new Error("VERSION_CONFLICT");
          await transaction.navigationGroup.create({
            data: {
              id: entityId,
              label: parsed.data.snapshot.label,
              sortOrder: parsed.data.snapshot.sortOrder,
              visibility: "HIDDEN",
              version: 0,
            },
          });
        }
      } else {
        const current = await transaction.portfolioTab.findUnique({ where: { id: entityId } });
        if (current && current.version !== parsed.data.expectedVersion) throw new Error("VERSION_CONFLICT");
        const slugOwner = await transaction.portfolioTab.findFirst({
          where: { slug: parsed.data.snapshot.slug, id: { not: entityId } },
          select: { id: true },
        });
        const aliasOwner = await transaction.tabSlugAlias.findFirst({
          where: { oldSlug: parsed.data.snapshot.slug, tabId: { not: entityId } },
          select: { id: true },
        });
        if (slugOwner || aliasOwner) throw new Error("SLUG_CONFLICT");
        if (!current) {
          if (parsed.data.expectedVersion !== 0) throw new Error("VERSION_CONFLICT");
          await transaction.portfolioTab.create({
            data: {
              id: entityId,
              groupId: parsed.data.snapshot.groupId,
              slug: parsed.data.snapshot.slug,
              label: parsed.data.snapshot.label,
              description: parsed.data.snapshot.description,
              icon: parsed.data.snapshot.icon,
              template: parsed.data.snapshot.template,
              sortOrder: parsed.data.snapshot.sortOrder,
              publicationState: "DRAFT",
              version: 0,
            },
          });
        }
      }

      const saved = await transaction.contentRevision.upsert({
        where: { entityType_entityId_version: { entityType: parsed.data.entityType, entityId, version: nextVersion } },
        update: { snapshot: parsed.data.snapshot as Prisma.InputJsonValue, authorId: admin.user.id, publishedAt: null },
        create: { entityType: parsed.data.entityType, entityId, version: nextVersion, snapshot: parsed.data.snapshot as Prisma.InputJsonValue, authorId: admin.user.id },
      });
      await transaction.auditLog.create({
        data: { actorId: admin.user.id, action: "content.draft.saved", entityType: parsed.data.entityType, entityId, metadata: { version: nextVersion, requestId: event.context.requestId } },
      });
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
