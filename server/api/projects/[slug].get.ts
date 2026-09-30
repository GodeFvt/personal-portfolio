import { getPublicProject } from "../../services/public-content";
import { apiData, apiError } from "../../utils/api-response";

export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "no-store");
  const slug = getRouterParam(event, "slug");
  if (!slug) {
    return apiError(event, 400, { code: "VALIDATION_ERROR", message: "Project slug is required." });
  }
  const project = await getPublicProject(slug);
  if (!project) {
    return apiError(event, 404, { code: "NOT_FOUND", message: "Project not found." });
  }
  return apiData(project);
});
