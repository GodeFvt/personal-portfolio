import { z } from "zod";
import {
  MediaStatus,
  MediaVisibility,
  NavigationVisibility,
  PublicationState,
} from "~~/generated/prisma/client";
import { apiError } from "../../utils/api-response";
import { useDatabase } from "../../utils/db";
import { mediaStorage } from "../../storage";

function containsMediaId(value: unknown, mediaId: string): boolean {
  if (value === mediaId) return true;
  if (Array.isArray(value)) return value.some((item) => containsMediaId(item, mediaId));
  if (value && typeof value === "object") {
    return Object.values(value).some((item) => containsMediaId(item, mediaId));
  }
  return false;
}

export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "no-store");
  setHeader(event, "X-Content-Type-Options", "nosniff");
  const id = getRouterParam(event, "id");
  if (!id || !z.string().uuid().safeParse(id).success) {
    return apiError(event, 400, { code: "VALIDATION_ERROR", message: "Media id is required." });
  }

  const prisma = useDatabase();
  const asset = await prisma.mediaAsset.findFirst({
    where: {
      id,
      status: MediaStatus.READY,
      visibility: MediaVisibility.PUBLIC,
    },
    include: {
      profilePortraits: { select: { id: true }, take: 1 },
      profileResumes: { select: { id: true }, take: 1 },
      projectCovers: {
        where: { publicationState: PublicationState.PUBLISHED },
        select: { id: true },
        take: 1,
      },
    },
  });
  if (!asset) {
    return apiError(event, 404, { code: "NOT_FOUND", message: "Media not found." });
  }

  let isPublishedReference =
    asset.profilePortraits.length > 0 ||
    asset.profileResumes.length > 0 ||
    asset.projectCovers.length > 0;

  if (!isPublishedReference) {
    const blocks = await prisma.pageBlock.findMany({
      where: {
        publicationState: PublicationState.PUBLISHED,
        tab: {
          publicationState: PublicationState.PUBLISHED,
          group: { visibility: NavigationVisibility.VISIBLE },
        },
      },
      select: { props: true },
    });
    isPublishedReference = blocks.some((block) => containsMediaId(block.props, asset.id));
  }

  if (!isPublishedReference) {
    return apiError(event, 404, { code: "NOT_FOUND", message: "Media not found." });
  }

  setHeader(event, "Content-Type", asset.mimeType);
  setHeader(
    event,
    "Content-Disposition",
    `inline; filename*=UTF-8''${encodeURIComponent(asset.originalName)}`,
  );
  const object = await mediaStorage(asset.provider).read(asset.storageKey);
  if (!object) return apiError(event, 404, { code: "NOT_FOUND", message: "Media not found." });
  setHeader(event, "Content-Length", object.size);
  return sendStream(event, object.stream);
});
