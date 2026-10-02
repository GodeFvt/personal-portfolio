export interface References {
  profiles: unknown[];
  projects: unknown[];
  blocks: unknown[];
  drafts: unknown[];
}

export interface MediaItem {
  id: string;
  originalName: string;
  mimeType: string;
  size: string;
  width: number | null;
  height: number | null;
  alt: string;
  provider: string;
  visibility: "PRIVATE" | "PUBLIC";
  status: string;
  version: number;
  createdAt: string;
  contentUrl: string | null;
  publicUrl: string | null;
  references: References;
}

export interface MediaResponse {
  data: { items: MediaItem[] };
}
