import type { MediaItem as LibraryMediaItem } from "./media";

export type MediaItem = Pick<
  LibraryMediaItem,
  "id" | "originalName" | "mimeType" | "alt" | "width" | "height" | "contentUrl"
>;
export interface MediaResponse {
  data: { items: MediaItem[] };
}
