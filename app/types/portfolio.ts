import type {
  PublicProfile,
  PublicProject,
  PublicExperience,
  PublicSkillGroup,
  PublicTabSummary,
  SiteApiData,
  ApiEnvelope,
  PortfolioApiData,
  PublicTemplate,
} from "~~/shared/types/portfolio-api";
import type { RequestHistoryEntry } from "~/types/request-cache";

export interface PortfolioProfile extends PublicProfile {
  github: string;
  linkedin: string;
  resume: string;
  portrait: string | null;
}
export interface PortfolioEndpoint extends PublicTabSummary {
  group: string;
}
export interface PageHeading {
  kicker: string;
  heading: string;
  description: string;
}
export interface PortfolioLink {
  label: string;
  url: string;
  description: string;
}
export interface LinkListContent {
  heading: string;
  links: PortfolioLink[];
}

export interface PortfolioPreviewProps {
  site: SiteApiData | null;
  activeId: string;
  activeTemplate: PublicTemplate | undefined;
  response: ApiEnvelope<PortfolioApiData> | null;
  responseTab: "preview" | "json" | "headers";
  responseJson: string;
  responseHeaders: [string, string][];
  loading: boolean;
  showSkeleton: boolean;
  sendRequest: () => Promise<void>;
  setContentPane: (element: unknown) => void;
  resetPreviewScroll: () => void;
  navigateTemplate: (template: string) => void;
  inspectProject: (slug: string) => Promise<void>;
  copy: (text: string, label: string) => Promise<void>;
}

/** Explicit view contracts are readable and resolvable by Vue's SFC compiler. */
export interface PortfolioWorkspaceView {
  site: SiteApiData | null;
  profile: PortfolioProfile;
  activeEndpoint: PortfolioEndpoint | undefined;
  endpoints: PortfolioEndpoint[];
  filteredEndpoints: PortfolioEndpoint[];
  activeId: string;
  groupNames: string[];
  search: string;
  sidebarOpen: boolean;
  sidebarView: "collections" | "history";
  history: RequestHistoryEntry[];
  clearHistory: () => void;
  navigate: (id: string) => Promise<void>;
  navigateTemplate: (template: string) => void;
  openHistory: (entry: RequestHistoryEntry) => Promise<void>;
  historyTime: (createdAt: number) => string;
  setSearchInput: (element: unknown) => void;
  setRequestTabs: (element: unknown) => void;
  setDialog: (element: unknown) => void;
  requestHost: string;
  requestUrl: string;
  loading: boolean;
  requestError: string;
  status: number | null;
  duration: number | null;
  responseBytes: number;
  responseJson: string;
  servedFromCache: boolean;
  responseTab: "preview" | "json" | "headers";
  sendRequest: () => Promise<void>;
  onTabKey: (event: KeyboardEvent) => void;
  copy: (text: string, label: string) => Promise<void>;
  pageHeading: PageHeading;
  introductionHero: PageHeading & {
    primarySlug: string;
    secondarySlug: string;
    fullName: string;
    roleLabel: string;
    primaryAction: string;
    secondaryAction: string;
  };
  introductionHeadingLines: string[];
  introductionFocus: { heading: string; items: string[] };
  introductionProjectsHeading: { heading: string; description: string };
  introductionOrigin: PageHeading;
  projects: PublicProject[];
  displayedProjects: PublicProject[];
  archive: PublicProject[];
  projectFilter: string;
  experience: PublicExperience[];
  selectedJob: number;
  skillGroups: PublicSkillGroup[];
  selectedStack: number;
  linkListContent: LinkListContent;
  contactSocialLinks: PortfolioLink[];
  contactSignoff: string;
  inspectProject: (slug: string) => Promise<void>;
  dialog: HTMLDialogElement | undefined;
  selectedProject: PublicProject | null;
}
