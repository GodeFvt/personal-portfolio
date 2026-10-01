import type { Prisma } from "~~/generated/prisma/client";
import { MediaStatus, MediaVisibility } from "~~/generated/prisma/client";
import { mediaSizeLimit } from "~~/shared/schemas/media";
import { mediaStorage } from "../storage";
import { useDatabase } from "../utils/db";
import { inspectMedia } from "./media-security";

export { inspectMedia, issueMediaUploadToken, safeOriginalName, verifyMediaUploadToken } from "./media-security";

export async function verifyAndCompleteMedia(assetId: string) {
  const db = useDatabase();
  const asset = await db.mediaAsset.findUnique({ where: { id: assetId } });
  if (!asset) throw new Error("Media upload does not exist.");
  if (asset.status === MediaStatus.READY) return asset;
  if (asset.status !== MediaStatus.PENDING) throw new Error("Media upload cannot be completed.");

  const buffer = await mediaStorage(asset.provider).readBuffer(asset.storageKey, mediaSizeLimit(asset.mimeType) + 1);
  if (!buffer) throw new Error("Uploaded object was not found or exceeded the allowed size.");
  try {
    const inspected = inspectMedia(buffer, asset.mimeType);
    if (BigInt(inspected.size) !== asset.size) throw new Error("Uploaded object size does not match the reservation.");
    return await db.mediaAsset.update({
      where: { id: asset.id, status: MediaStatus.PENDING },
      data: { status: MediaStatus.READY, mimeType: inspected.mimeType, width: inspected.width, height: inspected.height, version: { increment: 1 } },
    });
  } catch (error) {
    await db.mediaAsset.updateMany({ where: { id: asset.id, status: MediaStatus.PENDING }, data: { status: MediaStatus.FAILED, version: { increment: 1 } } });
    await mediaStorage(asset.provider).delete(asset.storageKey).catch(() => undefined);
    throw error;
  }
}

function containsMediaId(value: unknown, mediaId: string): boolean {
  if (value === mediaId) return true;
  if (Array.isArray(value)) return value.some((item) => containsMediaId(item, mediaId));
  return Boolean(value && typeof value === "object" && Object.values(value).some((item) => containsMediaId(item, mediaId)));
}

export async function mediaReferences(mediaId: string) {
  const db = useDatabase();
  const [portraits, resumes, covers, blocks, revisions] = await Promise.all([
    db.profile.findMany({ where: { portraitMediaId: mediaId }, select: { id: true, name: true } }),
    db.profile.findMany({ where: { resumeMediaId: mediaId }, select: { id: true, name: true } }),
    db.project.findMany({ where: { coverMediaId: mediaId }, select: { id: true, name: true, publicationState: true } }),
    db.pageBlock.findMany({ select: { id: true, tabId: true, props: true } }),
    db.contentRevision.findMany({ where: { publishedAt: null }, select: { id: true, entityType: true, entityId: true, snapshot: true } }),
  ]);
  return {
    profiles: [
      ...portraits.map((item) => ({ ...item, field: "portrait" })),
      ...resumes.map((item) => ({ ...item, field: "resume" })),
    ],
    projects: covers,
    blocks: blocks.filter((item) => containsMediaId(item.props, mediaId)).map(({ props: _props, ...item }) => item),
    drafts: revisions.filter((item) => containsMediaId(item.snapshot, mediaId)).map(({ snapshot: _snapshot, ...item }) => item),
  };
}

export function hasMediaReferences(references: Awaited<ReturnType<typeof mediaReferences>>) {
  return Object.values(references).some((items) => items.length > 0);
}

export async function cleanupOrphanMedia(graceHours = 24) {
  const db = useDatabase();
  const cutoff = new Date(Date.now() - graceHours * 60 * 60 * 1000);
  const candidates = await db.mediaAsset.findMany({
    where: { createdAt: { lt: cutoff }, OR: [{ status: { in: [MediaStatus.PENDING, MediaStatus.FAILED, MediaStatus.DELETING] } }, { status: MediaStatus.READY, visibility: MediaVisibility.PRIVATE }] },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  let deleted = 0;
  for (const asset of candidates) {
    if (hasMediaReferences(await mediaReferences(asset.id))) continue;
    await db.mediaAsset.update({ where: { id: asset.id }, data: { status: MediaStatus.DELETING } }).catch(() => undefined);
    try {
      await mediaStorage(asset.provider).delete(asset.storageKey);
      await db.mediaAsset.delete({ where: { id: asset.id } });
      deleted++;
    } catch {
      await db.mediaAsset.updateMany({ where: { id: asset.id }, data: { status: MediaStatus.FAILED } });
    }
  }
  return { scanned: candidates.length, deleted };
}

export function mediaAuditMetadata(asset: { provider: string; mimeType: string; size: bigint }): Prisma.InputJsonValue {
  return { provider: asset.provider, mimeType: asset.mimeType, size: asset.size.toString() };
}
