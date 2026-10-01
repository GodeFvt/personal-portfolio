import { z } from "zod";
import { apiData, apiError } from "../../../utils/api-response";
import { assertSameOrigin } from "../../../utils/admin-auth";
import { useDatabase } from "../../../utils/db";
import { loadOpenInvitation } from "../../../services/oauth-invitations";

const previewSchema = z.object({ token: z.string().min(32).max(512) });

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");
  try { assertSameOrigin(event); }
  catch { return apiError(event, 403, { code: "REQUEST_REJECTED", message: "Request rejected." }); }

  const parsed = previewSchema.safeParse(await readBody(event));
  if (!parsed.success) return apiError(event, 400, { code: "VALIDATION_ERROR", message: "Invitation token is required." });

  try {
    const [invitation, providers] = await Promise.all([
      loadOpenInvitation(parsed.data.token),
      useDatabase().oAuthProvider.findMany({
        where: { enabled: true, activeConfigVersion: { not: null } },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        select: { key: true, type: true, label: true },
      }),
    ]);
    return apiData({ email: invitation.normalizedEmail, providers });
  } catch (error) {
    const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 500;
    if (status === 410) return apiError(event, 410, { code: "INVITATION_EXPIRED", message: "This invitation is invalid or has expired." });
    throw error;
  }
});
