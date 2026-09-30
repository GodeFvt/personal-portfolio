import { getPublicSite } from "../services/public-content";
import { apiData, apiError } from "../utils/api-response";

export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "no-store");
  const site = await getPublicSite();
  if (!site) {
    return apiError(event, 404, {
      code: "SITE_NOT_CONFIGURED",
      message: "The published site is not configured.",
    });
  }
  return apiData(site);
});
