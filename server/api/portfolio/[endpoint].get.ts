import {
  isWorkspaceEndpoint,
  workspaceData,
} from "../../../shared/data/workspace";

export default defineEventHandler((event) => {
  const endpoint = getRouterParam(event, "endpoint");
  if (!isWorkspaceEndpoint(endpoint))
    throw createError({
      statusCode: 404,
      statusMessage: "Portfolio endpoint not found",
    });
  setHeader(event, "Cache-Control", "no-store");
  return workspaceData[endpoint];
});
