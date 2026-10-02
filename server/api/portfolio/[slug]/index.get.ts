import { HttpStatus } from "~~/server/utils/http-status";
import { ApiErrorCode } from "~~/shared/schemas/api";
import { z } from "zod";
import { paginationQuerySchema } from "../../../../shared/schemas/api";
import { getPublicPortfolioTab } from "../../../services/public-content";
import { apiData, apiError, apiPage, paginationMeta } from "../../../utils/api-response";

const querySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
  category: z.enum(["all", "backend", "fullstack"]).optional(),
});

export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "no-store");
  const slug = getRouterParam(event, "slug");
  if (!slug) {
    return apiError(event, HttpStatus.BAD_REQUEST, { code: ApiErrorCode.VALIDATION_ERROR, message: "Portfolio slug is required." });
  }

  const parsed = querySchema.safeParse(getQuery(event));
  if (!parsed.success) {
    return apiError(event, HttpStatus.BAD_REQUEST, {
      code: ApiErrorCode.VALIDATION_ERROR,
      message: "Please check the submitted query.",
      fields: Object.fromEntries(
        Object.entries(z.flattenError(parsed.error).fieldErrors).map(([key, messages]) => [key, messages ?? []]),
      ),
    });
  }

  const result = await getPublicPortfolioTab(slug, parsed.data);
  if (!result) {
    return apiError(event, HttpStatus.NOT_FOUND, { code: ApiErrorCode.NOT_FOUND, message: "Portfolio tab not found." });
  }
  if (result.total !== undefined && result.data.items) {
    const { items, ...rest } = result.data;
    return apiPage(items, paginationMeta(parsed.data.page, parsed.data.perPage, result.total), rest);
  }
  return apiData(result.data);
});
