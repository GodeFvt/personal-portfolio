import { MediaStatus, MediaVisibility } from "~~/generated/prisma/client";
import { HttpStatus } from "~~/server/utils/http-status";
import { ApiErrorCode } from "~~/shared/schemas/api";
import { z } from "zod";
import { mediaReferences } from "../../../services/media";
import { mediaUrl } from "../../../services/media-links";
import { apiData, apiError } from "../../../utils/api-response";
import { requirePermission } from "../../../utils/admin-auth";
import { useDatabase } from "../../../utils/db";

const querySchema = z.object({
  status: z.enum(["PENDING", "READY", "DELETING", "FAILED"]).optional(),
  kind: z.enum(["image", "pdf"]).optional(),
});

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "private, no-store");
  try {
    await requirePermission(event, "content.read");
  } catch (error) {
    const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : HttpStatus.UNAUTHORIZED;
    return apiError(event, status, { code: status === HttpStatus.FORBIDDEN ? ApiErrorCode.PERMISSION_DENIED : ApiErrorCode.AUTH_REQUIRED, message: status === HttpStatus.FORBIDDEN ? "Permission denied." : "Authentication required." });
  }
  const query = querySchema.safeParse(getQuery(event));
  if (!query.success) return apiError(event, HttpStatus.BAD_REQUEST, { code: ApiErrorCode.VALIDATION_ERROR, message: "Invalid media filter." });
  const items = await useDatabase().mediaAsset.findMany({
    where: {
      ...(query.data.status ? { status: query.data.status } : {}),
      ...(query.data.kind === "image" ? { mimeType: { startsWith: "image/" } } : query.data.kind === "pdf" ? { mimeType: "application/pdf" } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 200,
  });
  const withReferences = await Promise.all(items.map(async (item) => ({
    ...item,
    size: item.size.toString(),
    references: await mediaReferences(item.id),
    contentUrl: item.status === MediaStatus.READY ? `/api/admin/media/${item.id}/content` : null,
    publicUrl: item.status === MediaStatus.READY && item.visibility === MediaVisibility.PUBLIC ? mediaUrl(item.id) : null,
  })));
  return apiData({ items: withReferences });
});

