import type { Prisma, PrismaClient } from "~~/generated/prisma/client";
import {
  navigationGroupSnapshotSchema,
  portfolioTabSnapshotSchema,
} from "~~/shared/schemas/admin-content";

type Transaction = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

export class VersionConflictError extends Error {}

export async function publishNavigationRevisions(
  transaction: Transaction,
  revisions: { entityType: "NavigationGroup" | "PortfolioTab"; entityId: string; version: number }[],
  actorId: string,
  requestId?: string,
) {
  const ordered = [...revisions].sort((left, right) =>
    left.entityType === right.entityType ? 0 : left.entityType === "NavigationGroup" ? -1 : 1,
  );
  const publishedAt = new Date();

  for (const item of ordered) {
    const revision = await transaction.contentRevision.findUnique({
      where: {
        entityType_entityId_version: {
          entityType: item.entityType,
          entityId: item.entityId,
          version: item.version,
        },
      },
    });
    if (!revision || revision.publishedAt) throw new VersionConflictError("Draft revision is no longer publishable.");

    if (item.entityType === "NavigationGroup") {
      const snapshot = navigationGroupSnapshotSchema.parse(revision.snapshot);
      const updated = await transaction.navigationGroup.updateMany({
        where: { id: item.entityId, version: item.version - 1 },
        data: { ...snapshot, version: item.version },
      });
      if (updated.count !== 1) throw new VersionConflictError("Navigation group changed after this draft was saved.");
    } else {
      const snapshot = portfolioTabSnapshotSchema.parse(revision.snapshot);
      const current = await transaction.portfolioTab.findUnique({ where: { id: item.entityId } });
      if (!current || current.version !== item.version - 1) {
        throw new VersionConflictError("Portfolio tab changed after this draft was saved.");
      }
      if (current.slug !== snapshot.slug) {
        await transaction.tabSlugAlias.upsert({
          where: { oldSlug: current.slug },
          update: { tabId: current.id },
          create: { oldSlug: current.slug, tabId: current.id },
        });
      }
      await transaction.portfolioTab.update({
        where: { id: current.id },
        data: {
          groupId: snapshot.groupId,
          slug: snapshot.slug,
          label: snapshot.label,
          description: snapshot.description,
          icon: snapshot.icon,
          template: snapshot.template,
          sortOrder: snapshot.sortOrder,
          publicationState: snapshot.publicationState,
          version: item.version,
        },
      });
      await transaction.pageBlock.deleteMany({ where: { tabId: current.id } });
      if (snapshot.blocks.length) {
        await transaction.pageBlock.createMany({
          data: snapshot.blocks.map((block, sortOrder) => ({
            tabId: current.id,
            type: block.type,
            sortOrder,
            props: block.props as Prisma.InputJsonValue,
            publicationState: "PUBLISHED",
          })),
        });
      }
    }

    await transaction.contentRevision.update({
      where: { id: revision.id },
      data: { publishedAt },
    });
    await transaction.auditLog.create({
      data: {
        actorId,
        action: "content.publish",
        entityType: item.entityType,
        entityId: item.entityId,
        metadata: { version: item.version, requestId },
      },
    });
  }

  return { publishedAt, count: ordered.length };
}
