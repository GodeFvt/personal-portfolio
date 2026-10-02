import type { Prisma, SiteSettings } from "~~/generated/prisma/client";
import type { Serialized } from "~~/shared/types/serialization";

export type ContentProfile = Serialized<
  Prisma.ProfileGetPayload<{ include: { education: true; socialLinks: true } }>
>;
export type ContentProject = Serialized<
  Prisma.ProjectGetPayload<{
    include: { highlights: true; technologies: true };
  }>
>;
export type ContentExperience = Serialized<
  Prisma.ExperienceGetPayload<{
    include: { details: true; technologies: true };
  }>
>;

export type EntityType =
  "Profile" | "Project" | "Experience" | "SkillGroup" | "SiteSettings";

export interface Revision {
  id: string;
  entityType: EntityType;
  entityId: string;
  version: number;
  createdAt: string;
}

export interface Technology {
  id: string;
  name: string;
  sortOrder: number;
}

export interface SkillGroup {
  id: string;
  label: string;
  icon: string;
  sortOrder: number;
  version: number;
  technologies: Technology[];
}

export interface ContentResponse {
  data: {
    profile: ContentProfile | null;
    projects: ContentProject[];
    experiences: ContentExperience[];
    skillGroups: SkillGroup[];
    settings: Serialized<SiteSettings> | null;
    tabs: Array<{ id: string; label: string; slug: string }>;
    revisions: Revision[];
  };
}

export interface ContentEditorForm {
  name: string;
  alias: string;
  role: string;
  email: string;
  bio: string;
  focus: string;
  interestsText: string;
  location: string;
  legacyPortraitUrl: string | null;
  legacyResumeUrl: string | null;
  portraitMediaId: string | null;
  resumeMediaId: string | null;
  educationText: string;
  socialText: string;
  slug: string;
  category: string;
  period: string;
  summary: string;
  imageAlt: string;
  illustration: string | null;
  liveUrl: string | null;
  repoUrl: string | null;
  coverMediaId: string | null;
  featured: boolean;
  archived: boolean;
  sortOrder: number;
  publicationState: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  highlightsText: string;
  technologyIds: string[];
  company: string;
  fullCompany: string;
  description: string;
  detailsText: string;
  label: string;
  icon: string;
  technologiesText: string;
  siteName: string;
  logoText: string | null;
  footerText: string | null;
  seoTitle: string;
  seoDescription: string;
  defaultTabId: string | null;
  displayOptionsText: string;
}
