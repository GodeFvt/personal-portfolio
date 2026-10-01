import type { Prisma, PrismaClient } from "~~/generated/prisma/client";
import {
  experienceSnapshotSchema,
  navigationGroupSnapshotSchema,
  portfolioTabSnapshotSchema,
  profileSnapshotSchema,
  projectSnapshotSchema,
  siteSettingsSnapshotSchema,
  skillGroupSnapshotSchema,
} from "~~/shared/schemas/admin-content";

type Transaction = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

export class VersionConflictError extends Error {}

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
    } else if (item.entityType === "Profile") {
      const snapshot = profileSnapshotSchema.parse(revision.snapshot);
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
        const defaultTab = await transaction.portfolioTab.findFirst({ where: { id: snapshot.defaultTabId, publicationState: "PUBLISHED", group: { visibility: "VISIBLE" } }, select: { id: true } });
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
