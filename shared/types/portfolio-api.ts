export type PublicTemplate =
  | "introduction"
  | "project-list"
  | "experience-list"
  | "skill-list"
  | "contact"
  | "custom-page";

export interface PublicTabSummary {
  id: string;
  slug: string;
  label: string;
  description: string;
  icon: string;
  template: PublicTemplate;
}

export interface PublicNavigationGroup {
  id: string;
  label: string;
  tabs: PublicTabSummary[];
}

export interface PublicProfile {
  name: string;
  alias: string;
  role: string;
  email: string;
  bio: string;
  focus: string;
  interests: string[];
  location: string;
  portraitUrl: string | null;
  resumeUrl: string | null;
  education: { degree: string; institution: string; period: string }[];
  socialLinks: { type: string; label: string; url: string }[];
}

export interface PublicProject {
  id: string;
  slug: string;
  name: string;
  category: string;
  period: string;
  summary: string;
  image: string | null;
  imageAlt: string;
  kind: string | null;
  highlights: string[];
  stack: string[];
  liveUrl?: string;
  repoUrl?: string;
  featured: boolean;
  archived: boolean;
}

export interface PublicExperience {
  id: string;
  company: string;
  fullCompany: string;
  role: string;
  period: string;
  description: string;
  details: string[];
  tags: string[];
}

export interface PublicSkillGroup {
  id: string;
  label: string;
  icon: string;
  items: string[];
}

export interface PublicPageBlock {
  id: string;
  type: string;
  sortOrder: number;
  props: Record<string, unknown>;
}

export interface SiteApiData {
  settings: {
    siteName: string;
    logoText: string | null;
    footerText: string | null;
    seoTitle: string;
    seoDescription: string;
    displayOptions: Record<string, unknown>;
  };
  profile: PublicProfile;
  groups: PublicNavigationGroup[];
  defaultTabSlug: string | null;
}

export interface PortfolioApiData {
  tab: PublicTabSummary;
  blocks: PublicPageBlock[];
  content: {
    profile?: PublicProfile;
    projects?: PublicProject[];
    archive?: PublicProject[];
    experience?: PublicExperience[];
    skillGroups?: PublicSkillGroup[];
  };
  items?: PublicProject[];
}

export interface ApiEnvelope<T> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      perPage: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
}
