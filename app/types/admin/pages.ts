import type { z } from "zod";
import type {
  portfolioTabSnapshotSchema,
  savePageContentSchema,
} from "~~/shared/schemas/admin-content";
export type PageContentPayload = z.input<typeof savePageContentSchema>;
export type PageSnapshot = z.infer<typeof portfolioTabSnapshotSchema>;
export interface ContentPage extends Omit<PageSnapshot, "blocks"> {
  id: string;
  version: number;
  group: { label: string };
  blocks: Array<{
    type: PageSnapshot["blocks"][number]["type"];
    props: Record<string, unknown>;
  }>;
}
export interface PageRevision {
  id: string;
  entityId: string;
  version: number;
  snapshot: PageSnapshot;
}
export interface PagesResponse {
  data: { pages: ContentPage[]; revisions: PageRevision[] };
}
