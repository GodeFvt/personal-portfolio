import { saveNavigationDraftSchema } from "~~/shared/schemas/admin-content";
import { ApiErrorCode } from "~~/shared/schemas/api";
import { saveNavigationDraft } from "../../../services/content-drafts";
import { apiAuthorizationError, apiData, apiError, apiErrorFromException } from "../../../utils/api-response";
import { requireCsrf, requirePermission } from "../../../utils/admin-auth";
import { HttpStatus } from "../../../utils/http-status";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");

  let admin;
  try {
    await requireCsrf(event);
    admin = await requirePermission(event, "navigation.write");
  } catch (error) {
    return apiAuthorizationError(event, error, {
      forbiddenCode: ApiErrorCode.REQUEST_REJECTED,
      forbiddenMessage: "Request rejected.",
    });
  }

  const parsed = saveNavigationDraftSchema.safeParse(await readBody(event));
  if (!parsed.success) {
    return apiError(event, HttpStatus.BAD_REQUEST, {
      code: ApiErrorCode.VALIDATION_ERROR,
      message: "Please check the submitted fields.",
      fields: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const revision = await saveNavigationDraft(parsed.data, admin.user.id, event.context.requestId);
    return apiData({ revision });
  } catch (error) {
    return apiErrorFromException(event, error);
  }
});
