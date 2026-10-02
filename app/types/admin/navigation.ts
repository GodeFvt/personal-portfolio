import type { NavigationDraftPayload } from "~~/shared/types/admin-api";

type TabSnapshot = Extract<
  NavigationDraftPayload,
  { entityType: "PortfolioTab" }
>["snapshot"];

export interface Revision {
  id: string;
  entityType: "NavigationGroup" | "PortfolioTab";
  entityId: string;
  version: number;
  createdAt: string;
}

export interface NavigationResponse {
  data: {
    groups: Array<{
      id: string;
      label: string;
      sortOrder: number;
      visibility: "VISIBLE" | "HIDDEN" | "ARCHIVED";
      version: number;
      tabs: Array<{
        id: string;
        slug: string;
        label: string;
        description: string;
        icon: string;
        template: TabSnapshot["template"];
        publicationState: NonNullable<TabSnapshot["publicationState"]>;
        sortOrder: number;
        version: number;
        blocks: Array<{
          id: string;
          type: string;
          props: Record<string, unknown>;
        }>;
      }>;
    }>;
    revisions: Revision[];
  };
}

export interface NavigationBlockEditor {
  type: string;
  content?: string;
  mediaId?: string | null;
  alt?: string;
  heading?: string;
  linksText?: string;
  kicker?: string;
  description?: string;
  featuredOnly?: boolean;
  includeArchived?: boolean;
}
