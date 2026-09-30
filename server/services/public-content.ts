import type { Prisma } from "~~/generated/prisma/client";
import {
  NavigationVisibility,
  PageBlockType,
  PortfolioTemplate,
  PublicationState,
} from "~~/generated/prisma/client";
import type {
  PortfolioApiData,
  PublicExperience,
  PublicProfile,
  PublicProject,
  PublicSkillGroup,
  PublicTabSummary,
  PublicTemplate,
  SiteApiData,
} from "~~/shared/types/portfolio-api";
import { useDatabase } from "../utils/db";

const templateNames: Record<PortfolioTemplate, PublicTemplate> = {
  INTRODUCTION: "introduction",
  PROJECT_LIST: "project-list",
  EXPERIENCE_LIST: "experience-list",
  SKILL_LIST: "skill-list",
  CONTACT: "contact",
  CUSTOM_PAGE: "custom-page",
};

const projectInclude = {
  coverMedia: { select: { id: true } },
  highlights: { orderBy: { sortOrder: "asc" as const } },
  technologies: {
    orderBy: { sortOrder: "asc" as const },
    include: { technology: { select: { name: true } } },
  },
} satisfies Prisma.ProjectInclude;

function tabSummary(tab: {
  id: string;
  slug: string;
  label: string;
  description: string;
  icon: string;
  template: PortfolioTemplate;
}): PublicTabSummary {
  return { ...tab, template: templateNames[tab.template] };
}

function projectData(
  project: Prisma.ProjectGetPayload<{ include: typeof projectInclude }>,
): PublicProject {
  return {
    id: project.id,
    slug: project.slug,
    name: project.name,
    category: project.category,
    period: project.period,
    summary: project.summary,
    image: project.coverMedia ? `/api/media/${project.coverMedia.id}` : null,
    imageAlt: project.imageAlt,
    kind: project.illustration,
    highlights: project.highlights.map((item) => item.text),
    stack: project.technologies.map((item) => item.technology.name),
    ...(project.liveUrl ? { liveUrl: project.liveUrl } : {}),
    ...(project.repoUrl ? { repoUrl: project.repoUrl } : {}),
    featured: project.featured,
    archived: project.archived,
  };
}

async function profileData(): Promise<PublicProfile> {
  const prisma = useDatabase();
  const profile = await prisma.profile.findFirst({
    include: {
      portraitMedia: { select: { id: true } },
      resumeMedia: { select: { id: true } },
      education: { orderBy: { sortOrder: "asc" } },
      socialLinks: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!profile) throw new Error("Published profile is not configured.");

  return {
    name: profile.name,
    alias: profile.alias,
    role: profile.role,
    email: profile.email,
    bio: profile.bio,
    focus: profile.focus,
    interests: Array.isArray(profile.interests)
      ? profile.interests.filter((item): item is string => typeof item === "string")
      : [],
    location: profile.location,
    portraitUrl: profile.portraitMedia
      ? `/api/media/${profile.portraitMedia.id}`
      : profile.legacyPortraitUrl,
    resumeUrl: profile.resumeMedia
      ? `/api/media/${profile.resumeMedia.id}`
      : profile.legacyResumeUrl,
    education: profile.education.map((item) => ({
      degree: item.degree,
      institution: item.institution,
      period: item.period,
    })),
    socialLinks: profile.socialLinks.map((item) => ({
      type: item.type,
      label: item.label,
      url: item.url,
    })),
  };
}

export async function getPublicSite(): Promise<SiteApiData | null> {
  const prisma = useDatabase();
  const [settings, profile, groups] = await Promise.all([
    prisma.siteSettings.findFirst({ include: { defaultTab: true } }),
    profileData(),
    prisma.navigationGroup.findMany({
      where: { visibility: NavigationVisibility.VISIBLE },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      include: {
        tabs: {
          where: { publicationState: PublicationState.PUBLISHED },
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        },
      },
    }),
  ]);
  if (!settings) return null;

  const publicGroups = groups
    .filter((group) => group.tabs.length > 0)
    .map((group) => ({
      id: group.id,
      label: group.label,
      tabs: group.tabs.map(tabSummary),
    }));
  const allTabs = publicGroups.flatMap((group) => group.tabs);
  const configuredDefault = allTabs.find((tab) => tab.id === settings.defaultTabId);

  return {
    settings: {
      siteName: settings.siteName,
      logoText: settings.logoText,
      footerText: settings.footerText,
      seoTitle: settings.seoTitle,
      seoDescription: settings.seoDescription,
      displayOptions:
        settings.displayOptions && typeof settings.displayOptions === "object" && !Array.isArray(settings.displayOptions)
          ? (settings.displayOptions as Record<string, unknown>)
          : {},
    },
    profile,
    groups: publicGroups,
    defaultTabSlug: configuredDefault?.slug ?? allTabs[0]?.slug ?? null,
  };
}

export async function findPublishedTab(slug: string) {
  return useDatabase().portfolioTab.findFirst({
    where: {
      publicationState: PublicationState.PUBLISHED,
      group: { visibility: NavigationVisibility.VISIBLE },
      OR: [{ slug }, { aliases: { some: { oldSlug: slug } } }],
    },
    include: {
      blocks: {
        where: { publicationState: PublicationState.PUBLISHED },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      },
    },
  });
}

export async function getPublicPortfolioTab(
  slug: string,
  options: { page: number; perPage: number; search?: string; category?: string },
): Promise<{ data: PortfolioApiData; total?: number } | null> {
  const prisma = useDatabase();
  const tab = await findPublishedTab(slug);
  if (!tab) return null;

  const data: PortfolioApiData = {
    tab: tabSummary(tab),
    blocks: tab.blocks.map((block) => ({
      id: block.id,
      type: block.type.toLowerCase().replaceAll("_", "-"),
      sortOrder: block.sortOrder,
      props:
        block.props && typeof block.props === "object" && !Array.isArray(block.props)
          ? (block.props as Record<string, unknown>)
          : {},
    })),
    content: {},
  };

  if (tab.template === PortfolioTemplate.INTRODUCTION) {
    const [profile, projects] = await Promise.all([
      profileData(),
      prisma.project.findMany({
        where: { publicationState: PublicationState.PUBLISHED, featured: true, archived: false },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        include: projectInclude,
      }),
    ]);
    data.content = { profile, projects: projects.map(projectData) };
  } else if (tab.template === PortfolioTemplate.PROJECT_LIST) {
    const search = options.search?.trim();
    const category = options.category?.trim().toLowerCase();
    const where: Prisma.ProjectWhereInput = {
      publicationState: PublicationState.PUBLISHED,
      archived: false,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { summary: { contains: search, mode: "insensitive" } },
              { category: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(category && category !== "all"
        ? category === "backend"
          ? { illustration: "services" }
          : { NOT: { illustration: "services" } }
        : {}),
    };
    const [items, total, archived] = await Promise.all([
      prisma.project.findMany({
        where,
        skip: (options.page - 1) * options.perPage,
        take: options.perPage,
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        include: projectInclude,
      }),
      prisma.project.count({ where }),
      prisma.project.findMany({
        where: { publicationState: PublicationState.PUBLISHED, archived: true },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        include: projectInclude,
      }),
    ]);
    data.items = items.map(projectData);
    data.content = { archive: archived.map(projectData) };
    return { data, total };
  } else if (tab.template === PortfolioTemplate.EXPERIENCE_LIST) {
    const records = await prisma.experience.findMany({
      where: { publicationState: PublicationState.PUBLISHED },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      include: {
        details: { orderBy: { sortOrder: "asc" } },
        technologies: {
          orderBy: { sortOrder: "asc" },
          include: { technology: { select: { name: true } } },
        },
      },
    });
    data.content.experience = records.map<PublicExperience>((item) => ({
      id: item.id,
      company: item.company,
      fullCompany: item.fullCompany,
      role: item.role,
      period: item.period,
      description: item.description,
      details: item.details.map((detail) => detail.text),
      tags: item.technologies.map((technology) => technology.technology.name),
    }));
  } else if (tab.template === PortfolioTemplate.SKILL_LIST) {
    const groups = await prisma.skillGroup.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      include: { technologies: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] } },
    });
    data.content.skillGroups = groups.map<PublicSkillGroup>((group) => ({
      id: group.id,
      label: group.label,
      icon: group.icon,
      items: group.technologies.map((item) => item.name),
    }));
  } else if (tab.template === PortfolioTemplate.CONTACT) {
    data.content.profile = await profileData();
  } else if (tab.template === PortfolioTemplate.CUSTOM_PAGE) {
    const types = new Set(tab.blocks.map((block) => block.type));
    const [projects, experiences, groups] = await Promise.all([
      types.has(PageBlockType.PROJECT_GRID)
        ? prisma.project.findMany({
            where: { publicationState: PublicationState.PUBLISHED, archived: false },
            orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
            include: projectInclude,
          })
        : [],
      types.has(PageBlockType.TIMELINE)
        ? prisma.experience.findMany({
            where: { publicationState: PublicationState.PUBLISHED },
            orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
            include: {
              details: { orderBy: { sortOrder: "asc" as const } },
              technologies: {
                orderBy: { sortOrder: "asc" as const },
                include: { technology: { select: { name: true } } },
              },
            },
          })
        : [],
      types.has(PageBlockType.SKILL_GROUP)
        ? prisma.skillGroup.findMany({
            orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
            include: { technologies: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] } },
          })
        : [],
    ]);
    data.content = {
      ...(projects.length ? { projects: projects.map(projectData) } : {}),
      ...(experiences.length
        ? {
            experience: experiences.map<PublicExperience>((item) => ({
              id: item.id,
              company: item.company,
              fullCompany: item.fullCompany,
              role: item.role,
              period: item.period,
              description: item.description,
              details: item.details.map((detail) => detail.text),
              tags: item.technologies.map((technology) => technology.technology.name),
            })),
          }
        : {}),
      ...(groups.length
        ? {
            skillGroups: groups.map<PublicSkillGroup>((group) => ({
              id: group.id,
              label: group.label,
              icon: group.icon,
              items: group.technologies.map((item) => item.name),
            })),
          }
        : {}),
    };
  }

  return { data };
}

export async function getPublicProject(slug: string) {
  const project = await useDatabase().project.findFirst({
    where: { slug, publicationState: PublicationState.PUBLISHED, archived: false },
    include: projectInclude,
  });
  return project ? projectData(project) : null;
}
