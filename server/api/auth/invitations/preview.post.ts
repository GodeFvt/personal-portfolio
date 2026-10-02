import { HttpStatus } from "~~/server/utils/http-status";
import { ApiErrorCode } from "~~/shared/schemas/api";
import { z } from "zod";
import { apiData, apiError } from "../../../utils/api-response";
import { assertSameOrigin } from "../../../utils/admin-auth";
import { useDatabase } from "../../../utils/db";
import { loadOpenInvitation } from "../../../services/oauth-invitations";

const previewSchema = z.object({ token: z.string().min(32).max(512) });

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");
  try { assertSameOrigin(event); }
  catch { return apiError(event, HttpStatus.FORBIDDEN, { code: ApiErrorCode.REQUEST_REJECTED, message: "Request rejected." }); }

  const parsed = previewSchema.safeParse(await readBody(event));
  if (!parsed.success) return apiError(event, HttpStatus.BAD_REQUEST, { code: ApiErrorCode.VALIDATION_ERROR, message: "Invitation token is required." });

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
    const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : HttpStatus.INTERNAL_SERVER_ERROR;
    if (status === HttpStatus.GONE) return apiError(event, HttpStatus.GONE, { code: ApiErrorCode.INVITATION_EXPIRED, message: "This invitation is invalid or has expired." });
    throw error;
  }
});
