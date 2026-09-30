import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, PageBlockType, PortfolioTemplate, PublicationState } from "../generated/prisma/client";
import { archive, experience, profile, projects, skillGroups } from "../shared/data/portfolio";
import { endpoints, workspaceData } from "../shared/data/workspace";

const databaseUrl =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.PRISMA_DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Set DATABASE_URL, POSTGRES_URL, or PRISMA_DATABASE_URL before seeding.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const templateBySlug: Record<string, PortfolioTemplate> = {
  me: PortfolioTemplate.INTRODUCTION,
  projects: PortfolioTemplate.PROJECT_LIST,
  experience: PortfolioTemplate.EXPERIENCE_LIST,
  stack: PortfolioTemplate.SKILL_LIST,
  contact: PortfolioTemplate.CONTACT,
};

const groupOrder = ["The developer", "The work", "Say hello"];

const extraTechnologies: Record<string, string[]> = {
  Backend: ["Go", "Spring Boot", "gRPC", "OCPI", "RAG", "Keycloak"],
  "Data & infrastructure": ["MySQL", "MinIO", "Docker", "GitHub Actions"],
  "Beyond the backend": ["Vue", "Production operations", "Stakeholder collaboration"],
};

const blocksByTab: Record<string, { type: PageBlockType; props: object }[]> = {
  me: [
    {
      type: PageBlockType.TEXT,
      props: {
        type: "text",
        variant: "hero",
        kicker: "HEY, I'M GOT ↗",
        heading: "A little human. A lot of backend.",
        fullName: "Phuttinan Phaksaweng",
        roleLabel: "Developer",
        description: "I connect the things you see with the systems you don't.",
        primaryAction: { label: "Explore my work", tabSlug: "projects" },
        secondaryAction: { label: "Let's talk", tabSlug: "contact" },
      },
    },
    {
      type: PageBlockType.SKILL_GROUP,
      props: {
        type: "skill-group",
        variant: "focus-strip",
        heading: "MY KIND OF WORK",
        items: ["Backend systems", "Connected APIs", "Real-world delivery"],
      },
    },
    {
      type: PageBlockType.PROJECT_GRID,
      props: {
        type: "project-grid",
        heading: {
          heading: "Less talk. More shipped.",
          description: "A few things I've helped bring to life.",
        },
        featuredOnly: true,
        includeArchived: false,
      },
    },
    {
      type: PageBlockType.TEXT,
      props: {
        type: "text",
        variant: "origin",
        kicker: "BEFORE THE APIS",
        heading: "It started with a robot.",
        content: "LEGO robotics, competitions, and a curiosity about how things work. That same curiosity now goes into every system I build.",
      },
    },
  ],
  projects: [
    {
      type: PageBlockType.TEXT,
      props: {
        type: "text",
        variant: "heading",
        kicker: "SELECTED WORK",
        heading: "Ideas, with an implementation.",
        content: "School platforms, connected services, and the infrastructure underneath.",
      },
    },
    {
      type: PageBlockType.PROJECT_GRID,
      props: { type: "project-grid", featuredOnly: false, includeArchived: false },
    },
    {
      type: PageBlockType.LINK_LIST,
      props: {
        type: "link-list",
        heading: "The earlier experiments",
        links: archive.map((item) => ({ label: item.name, description: item.description, year: item.year, url: item.url })),
      },
    },
  ],
  experience: [
    {
      type: PageBlockType.TEXT,
      props: {
        type: "text",
        variant: "heading",
        kicker: "EXPERIENCE",
        heading: "Different teams. The same curiosity.",
        content: "From an internship to freelance delivery and EV charging systems.",
      },
    },
    { type: PageBlockType.TIMELINE, props: { type: "timeline" } },
    {
      type: PageBlockType.LINK_LIST,
      props: {
        type: "link-list",
        heading: "Want the full picture?",
        links: [{ label: "Take a look at my résumé.", url: "/resume/phuttinan-resume.pdf" }],
      },
    },
  ],
  stack: [
    {
      type: PageBlockType.TEXT,
      props: {
        type: "text",
        variant: "heading",
        kicker: "TECH STACK",
        heading: "Backend at heart. Fullstack by practice.",
        content: "The tools I use to take an idea from architecture to deployment.",
      },
    },
    { type: PageBlockType.SKILL_GROUP, props: { type: "skill-group" } },
  ],
  contact: [
    {
      type: PageBlockType.TEXT,
      props: {
        type: "text",
        variant: "heading",
        kicker: "LET'S CONNECT",
        heading: "Good things start with a hello.",
        content: "A role, a project, or a particularly interesting backend problem. I'd be happy to hear about it.",
      },
    },
    {
      type: PageBlockType.LINK_LIST,
      props: {
        type: "link-list",
        heading: "Best place to reach me.",
        links: [
          { label: "Email", url: `mailto:${profile.email}`, description: profile.email },
          { label: "GitHub", url: profile.github, description: "Code & experiments" },
          { label: "LinkedIn", url: profile.linkedin, description: "The professional side" },
          { label: "Résumé", url: "/resume/phuttinan-resume.pdf", description: "Download the full story" },
        ],
      },
    },
    {
      type: PageBlockType.TEXT,
      props: {
        type: "text",
        variant: "signoff",
        content: "Thanks for exploring my little corner of the internet. Got.",
      },
    },
  ],
};

async function seed() {
  const groups = new Map<string, string>();
  for (const [sortOrder, label] of groupOrder.entries()) {
    const group = await prisma.navigationGroup.upsert({
      where: { sortOrder },
      update: {},
      create: { label, sortOrder },
    });
    groups.set(label, group.id);
  }

  const tabs = new Map<string, string>();
  for (const endpoint of endpoints) {
    const groupEndpoints = endpoints.filter((item) => item.group === endpoint.group);
    const tab = await prisma.portfolioTab.upsert({
      where: { slug: endpoint.id },
      update: {},
      create: {
        groupId: groups.get(endpoint.group)!,
        slug: endpoint.id,
        label: endpoint.label,
        description: endpoint.description,
        icon: endpoint.icon,
        template: templateBySlug[endpoint.id]!,
        sortOrder: groupEndpoints.findIndex((item) => item.id === endpoint.id),
        publicationState: PublicationState.PUBLISHED,
      },
    });
    tabs.set(endpoint.id, tab.id);
  }

  await prisma.siteSettings.upsert({
    where: { id: "00000000-0000-4000-8000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000001",
      siteName: "Phuttinan Workspace",
      logoText: "phuttinan.workspace",
      footerText: "Built with intent. And Nuxt.",
      seoTitle: "Phuttinan Workspace | Backend & Fullstack Developer",
      seoDescription: "Meet Got. Explore real projects, backend systems, and the person behind the APIs in an interactive portfolio workspace.",
      defaultTabId: tabs.get("me"),
      displayOptions: { colorMode: "dark", accent: "pink", twitterCard: "summary" },
    },
  });

  const profileRecord = await prisma.profile.upsert({
    where: { id: "00000000-0000-4000-8000-000000000002" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000002",
      name: profile.name,
      alias: profile.alias,
      role: profile.role,
      email: profile.email,
      bio: "I connect the things you see with the systems you don't.",
      focus: workspaceData.me.focus,
      interests: workspaceData.me.interests,
      location: profile.location,
      legacyPortraitUrl: "/images/profile.jpg",
      legacyResumeUrl: workspaceData.contact.resume,
    },
  });

  await prisma.education.upsert({
    where: { profileId_sortOrder: { profileId: profileRecord.id, sortOrder: 0 } },
    update: {},
    create: {
      profileId: profileRecord.id,
      degree: workspaceData.me.education.degree,
      institution: workspaceData.me.education.university,
      period: workspaceData.me.education.period,
      sortOrder: 0,
    },
  });

  for (const [sortOrder, link] of [
    { type: "github", label: "GitHub", url: profile.github },
    { type: "linkedin", label: "LinkedIn", url: profile.linkedin },
    { type: "email", label: "Email", url: `mailto:${profile.email}` },
    { type: "resume", label: "Résumé", url: workspaceData.contact.resume },
  ].entries()) {
    await prisma.socialLink.upsert({
      where: { profileId_type: { profileId: profileRecord.id, type: link.type } },
      update: {},
      create: { profileId: profileRecord.id, ...link, sortOrder },
    });
  }

  const technologies = new Map<string, string>();
  for (const [groupOrderIndex, sourceGroup] of skillGroups.entries()) {
    const group = await prisma.skillGroup.upsert({
      where: { label: sourceGroup.label },
      update: {},
      create: { label: sourceGroup.label, icon: sourceGroup.icon, sortOrder: groupOrderIndex },
    });
    const names = [...sourceGroup.items, ...(extraTechnologies[sourceGroup.label] ?? [])];
    for (const name of [...new Set(names)]) {
      let technology = await prisma.technology.findUnique({
        where: { skillGroupId_name: { skillGroupId: group.id, name } },
      });
      if (!technology) {
        const last = await prisma.technology.aggregate({
          where: { skillGroupId: group.id },
          _max: { sortOrder: true },
        });
        technology = await prisma.technology.create({
          data: {
            skillGroupId: group.id,
            name,
            sortOrder: (last._max.sortOrder ?? -1) + 1,
          },
        });
      }
      technologies.set(name, technology.id);
    }
  }

  for (const [sortOrder, sourceProject] of projects.entries()) {
    const project = await prisma.project.upsert({
      where: { slug: sourceProject.slug },
      update: {},
      create: {
        slug: sourceProject.slug,
        name: sourceProject.name,
        category: sourceProject.category,
        period: sourceProject.period,
        summary: sourceProject.summary,
        imageAlt: sourceProject.imageAlt,
        illustration: sourceProject.kind,
        liveUrl: sourceProject.liveUrl,
        repoUrl: sourceProject.repoUrl,
        featured: true,
        sortOrder,
        publicationState: PublicationState.PUBLISHED,
      },
    });
    for (const [highlightOrder, text] of sourceProject.highlights.entries()) {
      await prisma.projectHighlight.upsert({
        where: { projectId_sortOrder: { projectId: project.id, sortOrder: highlightOrder } },
        update: {},
        create: { projectId: project.id, text, sortOrder: highlightOrder },
      });
    }
    for (const [technologyOrder, name] of sourceProject.stack.entries()) {
      const technologyId = technologies.get(name);
      if (!technologyId) throw new Error(`Seed technology mapping missing for project technology: ${name}`);
      await prisma.projectTechnology.upsert({
        where: { projectId_technologyId: { projectId: project.id, technologyId } },
        update: {},
        create: { projectId: project.id, technologyId, sortOrder: technologyOrder },
      });
    }
  }

  for (const [sortOrder, sourceProject] of archive.entries()) {
    await prisma.project.upsert({
      where: { slug: `archive-${sourceProject.year}-${sourceProject.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}` },
      update: {},
      create: {
        slug: `archive-${sourceProject.year}-${sourceProject.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
        name: sourceProject.name,
        category: "Archive",
        period: sourceProject.year,
        summary: sourceProject.description,
        imageAlt: `${sourceProject.name} project`,
        repoUrl: sourceProject.url,
        archived: true,
        sortOrder,
        publicationState: PublicationState.PUBLISHED,
      },
    });
  }

  for (const [sortOrder, sourceExperience] of experience.entries()) {
    const record = await prisma.experience.upsert({
      where: {
        company_role_period: {
          company: sourceExperience.company,
          role: sourceExperience.role,
          period: sourceExperience.period,
        },
      },
      update: {},
      create: {
        company: sourceExperience.company,
        fullCompany: sourceExperience.fullCompany,
        role: sourceExperience.role,
        period: sourceExperience.period,
        description: sourceExperience.description,
        sortOrder,
        publicationState: PublicationState.PUBLISHED,
      },
    });
    for (const [detailOrder, text] of sourceExperience.details.entries()) {
      await prisma.experienceDetail.upsert({
        where: { experienceId_sortOrder: { experienceId: record.id, sortOrder: detailOrder } },
        update: {},
        create: { experienceId: record.id, text, sortOrder: detailOrder },
      });
    }
    for (const [technologyOrder, name] of sourceExperience.tags.entries()) {
      const technologyId = technologies.get(name);
      if (!technologyId) throw new Error(`Seed technology mapping missing for experience technology: ${name}`);
      await prisma.experienceTechnology.upsert({
        where: { experienceId_technologyId: { experienceId: record.id, technologyId } },
        update: {},
        create: { experienceId: record.id, technologyId, sortOrder: technologyOrder },
      });
    }
  }

  for (const [slug, blocks] of Object.entries(blocksByTab)) {
    const tabId = tabs.get(slug)!;
    for (const [sortOrder, block] of blocks.entries()) {
      await prisma.pageBlock.upsert({
        where: { tabId_sortOrder: { tabId, sortOrder } },
        update: {},
        create: {
          tabId,
          type: block.type,
          sortOrder,
          props: block.props,
          publicationState: PublicationState.PUBLISHED,
        },
      });
    }
  }

  const [groupCount, tabCount, projectCount, experienceCount, technologyCount, blockCount] = await Promise.all([
    prisma.navigationGroup.count(),
    prisma.portfolioTab.count(),
    prisma.project.count(),
    prisma.experience.count(),
    prisma.technology.count(),
    prisma.pageBlock.count(),
  ]);
  console.log({ groupCount, tabCount, projectCount, experienceCount, technologyCount, blockCount });
}

seed()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
