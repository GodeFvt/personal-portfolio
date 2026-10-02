import { z } from "zod";
import { deletePortfolioTabSchema } from "~~/shared/schemas/admin-content";
import { ApiErrorCode } from "~~/shared/schemas/api";
import { deletePortfolioTab } from "~~/server/services/page-content";
import {
  apiAuthorizationError,
  apiData,
  apiError,
  apiErrorFromException,
} from "~~/server/utils/api-response";
import { requireCsrf, requirePermission } from "~~/server/utils/admin-auth";
import { HttpStatus } from "~~/server/utils/http-status";
export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "private, no-store");
  let admin;
  try {
    await requireCsrf(event);
    admin = await requirePermission(event, "navigation.write");
    await requirePermission(event, "content.publish");
  } catch (error) {
    return apiAuthorizationError(event, error);
  }
  const id = z.string().uuid().safeParse(getRouterParam(event, "id"));
  const parsed = deletePortfolioTabSchema.safeParse(await readBody(event));
  if (!id.success || !parsed.success)
    return apiError(event, HttpStatus.BAD_REQUEST, {
      code: ApiErrorCode.VALIDATION_ERROR,
      message: "Tab id and version are required.",
    });
  try {
    return apiData(
      await deletePortfolioTab(
        id.data,
        parsed.data.expectedVersion,
        admin.user.id,
        event.context.requestId,
      ),
    );
  } catch (error) {
    return apiErrorFromException(event, error);
  }
});
