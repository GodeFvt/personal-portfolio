import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "../../generated/prisma/client";
import {
  MediaStatus,
  MediaVisibility,
  NavigationVisibility,
  PublicationState,
} from "../../generated/prisma/client";
import {
  experienceSnapshotSchema,
  navigationGroupSnapshotSchema,
  portfolioTabSnapshotSchema,
  profileSnapshotSchema,
  projectSnapshotSchema,
  siteSettingsSnapshotSchema,
  skillGroupSnapshotSchema,
  type SaveContentDraftInput,
  type SaveNavigationDraftInput,
} from "../../shared/schemas/admin-content";
import { ApiErrorCode } from "../../shared/schemas/api";
import { AppError } from "../utils/app-error";
import { useDatabase } from "../utils/db";
import { HttpStatus } from "../utils/http-status";

type Transaction = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

export class VersionConflictError extends Error {}

async function publishMediaReferences(transaction: Transaction, mediaIds: (string | null | undefined)[]) {
  const ids = [...new Set(mediaIds.filter((id): id is string => Boolean(id)))];
  if (!ids.length) return;
  const ready = await transaction.mediaAsset.count({ where: { id: { in: ids }, status: MediaStatus.READY } });
  if (ready !== ids.length) throw new VersionConflictError("Selected media is missing or has not completed verification.");
  await transaction.mediaAsset.updateMany({ where: { id: { in: ids } }, data: { visibility: MediaVisibility.PUBLIC } });
}

export async function publishNavigationRevisions(
  transaction: Transaction,
  revisions: { entityType: "NavigationGroup" | "PortfolioTab" | "Profile" | "Project" | "Experience" | "SkillGroup" | "SiteSettings"; entityId: string; version: number }[],
  actorId: string,
  requestId?: string,
) {
  const priority = ["NavigationGroup", "SkillGroup", "Profile", "Project", "Experience", "PortfolioTab", "SiteSettings"];
  const ordered = [...revisions].sort((left, right) => priority.indexOf(left.entityType) - priority.indexOf(right.entityType));
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
    } else if (item.entityType === "PortfolioTab") {
      const snapshot = portfolioTabSnapshotSchema.parse(revision.snapshot);
      if (snapshot.publicationState === PublicationState.PUBLISHED) {
        await publishMediaReferences(transaction, snapshot.blocks.flatMap((block) => block.props.type === "image" ? [block.props.mediaId] : []));
      }
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
            publicationState: PublicationState.PUBLISHED,
          })),
        });
      }
    } else if (item.entityType === "Profile") {
      const snapshot = profileSnapshotSchema.parse(revision.snapshot);
      await publishMediaReferences(transaction, [snapshot.portraitMediaId, snapshot.resumeMediaId]);
      const updated = await transaction.profile.updateMany({
        where: { id: item.entityId, version: item.version - 1 },
        data: {
          name: snapshot.name,
          alias: snapshot.alias,
          role: snapshot.role,
          email: snapshot.email,
          bio: snapshot.bio,
          focus: snapshot.focus,
          interests: snapshot.interests,
          location: snapshot.location,
          legacyPortraitUrl: snapshot.legacyPortraitUrl || null,
          legacyResumeUrl: snapshot.legacyResumeUrl || null,
          portraitMediaId: snapshot.portraitMediaId,
          resumeMediaId: snapshot.resumeMediaId,
          version: item.version,
        },
      });
      if (updated.count !== 1) throw new VersionConflictError("Profile changed after this draft was saved.");
      await transaction.education.deleteMany({ where: { profileId: item.entityId } });
      await transaction.socialLink.deleteMany({ where: { profileId: item.entityId } });
      if (snapshot.education.length) await transaction.education.createMany({ data: snapshot.education.map((entry, sortOrder) => ({ ...entry, profileId: item.entityId, sortOrder })) });
      if (snapshot.socialLinks.length) await transaction.socialLink.createMany({ data: snapshot.socialLinks.map((entry, sortOrder) => ({ ...entry, profileId: item.entityId, sortOrder })) });
    } else if (item.entityType === "Project") {
      const snapshot = projectSnapshotSchema.parse(revision.snapshot);
      if (snapshot.publicationState === PublicationState.PUBLISHED) await publishMediaReferences(transaction, [snapshot.coverMediaId]);
      const current = await transaction.project.findUnique({ where: { id: item.entityId } });
      if (!current || current.version !== item.version - 1) throw new VersionConflictError("Project changed after this draft was saved.");
      const technologyCount = await transaction.technology.count({ where: { id: { in: snapshot.technologyIds } } });
      if (technologyCount !== new Set(snapshot.technologyIds).size) throw new VersionConflictError("A selected technology no longer exists.");
      await transaction.project.update({ where: { id: item.entityId }, data: {
        slug: snapshot.slug, name: snapshot.name, category: snapshot.category, period: snapshot.period,
        summary: snapshot.summary, imageAlt: snapshot.imageAlt, illustration: snapshot.illustration || null,
        liveUrl: snapshot.liveUrl || null, repoUrl: snapshot.repoUrl || null, coverMediaId: snapshot.coverMediaId,
        featured: snapshot.featured, archived: snapshot.archived, sortOrder: snapshot.sortOrder,
        publicationState: snapshot.publicationState, version: item.version,
      } });
      await transaction.projectHighlight.deleteMany({ where: { projectId: item.entityId } });
      await transaction.projectTechnology.deleteMany({ where: { projectId: item.entityId } });
      if (snapshot.highlights.length) await transaction.projectHighlight.createMany({ data: snapshot.highlights.map((text, sortOrder) => ({ projectId: item.entityId, text, sortOrder })) });
      if (snapshot.technologyIds.length) await transaction.projectTechnology.createMany({ data: snapshot.technologyIds.map((technologyId, sortOrder) => ({ projectId: item.entityId, technologyId, sortOrder })) });
    } else if (item.entityType === "Experience") {
      const snapshot = experienceSnapshotSchema.parse(revision.snapshot);
      const current = await transaction.experience.findUnique({ where: { id: item.entityId } });
      if (!current || current.version !== item.version - 1) throw new VersionConflictError("Experience changed after this draft was saved.");
      const technologyCount = await transaction.technology.count({ where: { id: { in: snapshot.technologyIds } } });
      if (technologyCount !== new Set(snapshot.technologyIds).size) throw new VersionConflictError("A selected technology no longer exists.");
      await transaction.experience.update({ where: { id: item.entityId }, data: {
        company: snapshot.company, fullCompany: snapshot.fullCompany, role: snapshot.role, period: snapshot.period,
        description: snapshot.description, sortOrder: snapshot.sortOrder, publicationState: snapshot.publicationState,
        version: item.version,
      } });
      await transaction.experienceDetail.deleteMany({ where: { experienceId: item.entityId } });
      await transaction.experienceTechnology.deleteMany({ where: { experienceId: item.entityId } });
      if (snapshot.details.length) await transaction.experienceDetail.createMany({ data: snapshot.details.map((text, sortOrder) => ({ experienceId: item.entityId, text, sortOrder })) });
      if (snapshot.technologyIds.length) await transaction.experienceTechnology.createMany({ data: snapshot.technologyIds.map((technologyId, sortOrder) => ({ experienceId: item.entityId, technologyId, sortOrder })) });
    } else if (item.entityType === "SkillGroup") {
      const snapshot = skillGroupSnapshotSchema.parse(revision.snapshot);
      const current = await transaction.skillGroup.findUnique({ where: { id: item.entityId }, include: { technologies: true } });
      if (!current || current.version !== item.version - 1) throw new VersionConflictError("Skill group changed after this draft was saved.");
      await transaction.skillGroup.update({ where: { id: item.entityId }, data: { label: snapshot.label, icon: snapshot.icon, sortOrder: snapshot.sortOrder, version: item.version } });
      const retainedIds = snapshot.technologies.flatMap((technology) => technology.id ? [technology.id] : []);
      if (retainedIds.some((id) => !current.technologies.some((technology) => technology.id === id))) throw new VersionConflictError("A technology changed after this draft was saved.");
      await transaction.technology.deleteMany({ where: { skillGroupId: item.entityId, id: { notIn: retainedIds } } });
      await transaction.technology.updateMany({ where: { skillGroupId: item.entityId }, data: { sortOrder: { increment: 1000 } } });
      for (const [sortOrder, technology] of snapshot.technologies.entries()) {
        if (technology.id) await transaction.technology.update({ where: { id: technology.id }, data: { name: technology.name, sortOrder } });
        else await transaction.technology.create({ data: { skillGroupId: item.entityId, name: technology.name, sortOrder } });
      }
    } else if (item.entityType === "SiteSettings") {
      const snapshot = siteSettingsSnapshotSchema.parse(revision.snapshot);
      if (snapshot.defaultTabId) {
        const defaultTab = await transaction.portfolioTab.findFirst({ where: { id: snapshot.defaultTabId, publicationState: PublicationState.PUBLISHED, group: { visibility: NavigationVisibility.VISIBLE } }, select: { id: true } });
        if (!defaultTab) throw new VersionConflictError("Default tab must be published and visible.");
      }
      const updated = await transaction.siteSettings.updateMany({ where: { id: item.entityId, version: item.version - 1 }, data: {
        siteName: snapshot.siteName, logoText: snapshot.logoText || null, footerText: snapshot.footerText || null,
        seoTitle: snapshot.seoTitle, seoDescription: snapshot.seoDescription, defaultTabId: snapshot.defaultTabId,
        displayOptions: snapshot.displayOptions as Prisma.InputJsonValue, version: item.version,
      } });
      if (updated.count !== 1) throw new VersionConflictError("Settings changed after this draft was saved.");
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

function draftConflict(code: typeof ApiErrorCode.VERSION_CONFLICT | typeof ApiErrorCode.SLUG_CONFLICT) {
  return new AppError({
    statusCode: HttpStatus.CONFLICT,
    code,
    message: code === ApiErrorCode.SLUG_CONFLICT
      ? "This slug is already used."
      : "This content changed. Reload before saving again.",
  });
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function saveContentDraft(
  input: SaveContentDraftInput,
  actorId: string,
  requestId?: string,
  db: PrismaClient = useDatabase(),
) {
  const entityId = input.entityId ?? randomUUID();
  const nextVersion = input.expectedVersion + 1;

  try {
    return await db.$transaction(async (transaction) => {
      if (input.entityType === "Profile") {
        const current = await transaction.profile.findUnique({ where: { id: entityId } });
        if (!current || current.version !== input.expectedVersion) throw draftConflict(ApiErrorCode.VERSION_CONFLICT);
      } else if (input.entityType === "SiteSettings") {
        const current = await transaction.siteSettings.findUnique({ where: { id: entityId } });
        if (!current || current.version !== input.expectedVersion) throw draftConflict(ApiErrorCode.VERSION_CONFLICT);
      } else if (input.entityType === "Project") {
        const current = await transaction.project.findUnique({ where: { id: entityId } });
        if (current && current.version !== input.expectedVersion) throw draftConflict(ApiErrorCode.VERSION_CONFLICT);
        const slugOwner = await transaction.project.findFirst({
          where: { slug: input.snapshot.slug, id: { not: entityId } },
          select: { id: true },
        });
        if (slugOwner) throw draftConflict(ApiErrorCode.SLUG_CONFLICT);
        if (!current) {
          if (input.expectedVersion !== 0) throw draftConflict(ApiErrorCode.VERSION_CONFLICT);
          await transaction.project.create({
            data: {
              id: entityId,
              slug: input.snapshot.slug,
              name: input.snapshot.name,
              category: input.snapshot.category,
              period: input.snapshot.period,
              summary: input.snapshot.summary,
              imageAlt: input.snapshot.imageAlt,
              illustration: input.snapshot.illustration || null,
              liveUrl: input.snapshot.liveUrl || null,
              repoUrl: input.snapshot.repoUrl || null,
              coverMediaId: input.snapshot.coverMediaId,
              featured: input.snapshot.featured,
              archived: input.snapshot.archived,
              sortOrder: input.snapshot.sortOrder,
              publicationState: PublicationState.DRAFT,
              version: 0,
            },
          });
        }
      } else if (input.entityType === "Experience") {
        const current = await transaction.experience.findUnique({ where: { id: entityId } });
        if (current && current.version !== input.expectedVersion) throw draftConflict(ApiErrorCode.VERSION_CONFLICT);
        if (!current) {
          if (input.expectedVersion !== 0) throw draftConflict(ApiErrorCode.VERSION_CONFLICT);
          await transaction.experience.create({
            data: {
              id: entityId,
              company: input.snapshot.company,
              fullCompany: input.snapshot.fullCompany,
              role: input.snapshot.role,
              period: input.snapshot.period,
              description: input.snapshot.description,
              sortOrder: input.snapshot.sortOrder,
              publicationState: PublicationState.DRAFT,
              version: 0,
            },
          });
        }
      } else if (input.entityType === "SkillGroup") {
        const current = await transaction.skillGroup.findUnique({ where: { id: entityId } });
        if (current && current.version !== input.expectedVersion) throw draftConflict(ApiErrorCode.VERSION_CONFLICT);
        if (!current) {
          if (input.expectedVersion !== 0) throw draftConflict(ApiErrorCode.VERSION_CONFLICT);
          await transaction.skillGroup.create({
            data: {
              id: entityId,
              label: input.snapshot.label,
              icon: input.snapshot.icon,
              sortOrder: input.snapshot.sortOrder,
              version: 0,
            },
          });
        }
      }

      const saved = await transaction.contentRevision.upsert({
        where: { entityType_entityId_version: { entityType: input.entityType, entityId, version: nextVersion } },
        update: { snapshot: input.snapshot as Prisma.InputJsonValue, authorId: actorId, publishedAt: null },
        create: { entityType: input.entityType, entityId, version: nextVersion, snapshot: input.snapshot as Prisma.InputJsonValue, authorId: actorId },
      });
      await transaction.auditLog.create({
        data: {
          actorId,
          action: "content.draft.saved",
          entityType: input.entityType,
          entityId,
          metadata: { version: nextVersion, requestId },
        },
      });
      return saved;
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) throw draftConflict(ApiErrorCode.VERSION_CONFLICT);
    throw error;
  }
}

export async function saveNavigationDraft(
  input: SaveNavigationDraftInput,
  actorId: string,
  requestId?: string,
  db: PrismaClient = useDatabase(),
) {
  const entityId = input.entityId ?? randomUUID();
  const nextVersion = input.expectedVersion + 1;

  try {
    return await db.$transaction(async (transaction) => {
      if (input.entityType === "NavigationGroup") {
        const current = await transaction.navigationGroup.findUnique({ where: { id: entityId } });
        if (current && current.version !== input.expectedVersion) throw draftConflict(ApiErrorCode.VERSION_CONFLICT);
        if (!current) {
          if (input.expectedVersion !== 0) throw draftConflict(ApiErrorCode.VERSION_CONFLICT);
          await transaction.navigationGroup.create({
            data: {
              id: entityId,
              label: input.snapshot.label,
              sortOrder: input.snapshot.sortOrder,
              visibility: NavigationVisibility.HIDDEN,
              version: 0,
            },
          });
        }
      } else {
        const current = await transaction.portfolioTab.findUnique({ where: { id: entityId } });
        if (current && current.version !== input.expectedVersion) throw draftConflict(ApiErrorCode.VERSION_CONFLICT);
        const [slugOwner, aliasOwner] = await Promise.all([
          transaction.portfolioTab.findFirst({
            where: { slug: input.snapshot.slug, id: { not: entityId } },
            select: { id: true },
          }),
          transaction.tabSlugAlias.findFirst({
            where: { oldSlug: input.snapshot.slug, tabId: { not: entityId } },
            select: { id: true },
          }),
        ]);
        if (slugOwner || aliasOwner) throw draftConflict(ApiErrorCode.SLUG_CONFLICT);
        if (!current) {
          if (input.expectedVersion !== 0) throw draftConflict(ApiErrorCode.VERSION_CONFLICT);
          await transaction.portfolioTab.create({
            data: {
              id: entityId,
              groupId: input.snapshot.groupId,
              slug: input.snapshot.slug,
              label: input.snapshot.label,
              description: input.snapshot.description,
              icon: input.snapshot.icon,
              template: input.snapshot.template,
              sortOrder: input.snapshot.sortOrder,
              publicationState: PublicationState.DRAFT,
              version: 0,
            },
          });
        }
      }

      const saved = await transaction.contentRevision.upsert({
        where: { entityType_entityId_version: { entityType: input.entityType, entityId, version: nextVersion } },
        update: { snapshot: input.snapshot as Prisma.InputJsonValue, authorId: actorId, publishedAt: null },
        create: { entityType: input.entityType, entityId, version: nextVersion, snapshot: input.snapshot as Prisma.InputJsonValue, authorId: actorId },
      });
      await transaction.auditLog.create({
        data: {
          actorId,
          action: "content.draft.saved",
          entityType: input.entityType,
          entityId,
          metadata: { version: nextVersion, requestId },
        },
      });
      return saved;
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) throw draftConflict(ApiErrorCode.VERSION_CONFLICT);
    throw error;
  }
}
