import { z } from "zod";
import { mediaReferences } from "../../../services/media";
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
    const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 401;
    return apiError(event, status, { code: status === 403 ? "PERMISSION_DENIED" : "AUTH_REQUIRED", message: status === 403 ? "Permission denied." : "Authentication required." });
  }
  const query = querySchema.safeParse(getQuery(event));
  if (!query.success) return apiError(event, 400, { code: "VALIDATION_ERROR", message: "Invalid media filter." });
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
    contentUrl: item.status === "READY" ? `/api/admin/media/${item.id}/content` : null,
  })));
  return apiData({ items: withReferences });
});

