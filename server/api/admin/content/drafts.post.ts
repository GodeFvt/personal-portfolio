import { saveContentDraftSchema } from "~~/shared/schemas/admin-content";
import { ApiErrorCode } from "~~/shared/schemas/api";
import { saveContentDraft } from "../../../services/content-drafts";
import { apiAuthorizationError, apiData, apiError, apiErrorFromException } from "../../../utils/api-response";
import { requireCsrf, requirePermission } from "../../../utils/admin-auth";
import { HttpStatus } from "../../../utils/http-status";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "private, no-store");

  let admin;
  try {
    await requireCsrf(event);
    admin = await requirePermission(event, "content.write");
  } catch (error) {
    return apiAuthorizationError(event, error, {
      forbiddenCode: ApiErrorCode.REQUEST_REJECTED,
      forbiddenMessage: "Request rejected.",
    });
  }

  const parsed = saveContentDraftSchema.safeParse(await readBody(event));
  if (!parsed.success) {
    return apiError(event, HttpStatus.BAD_REQUEST, {
      code: ApiErrorCode.VALIDATION_ERROR,
      message: "Please check the submitted fields.",
      fields: parsed.error.flatten().fieldErrors,
    });
  }

  if (parsed.data.entityType === "SiteSettings") {
    try {
      admin = await requirePermission(event, "settings.write");
    } catch (error) {
      return apiAuthorizationError(event, error);
    }
  }

  try {
    const revision = await saveContentDraft(parsed.data, admin.user.id, event.context.requestId);
    return apiData({ revision });
  } catch (error) {
    return apiErrorFromException(event, error);
  }
});
