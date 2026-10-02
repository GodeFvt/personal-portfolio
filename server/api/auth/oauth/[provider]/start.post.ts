import { HttpStatus } from "~~/server/utils/http-status";
import { startOAuth } from "../../../../services/oauth-flow";

export default defineEventHandler((event) => {
  const provider = getRouterParam(event, "provider");
  if (!provider) throw createError({ statusCode: HttpStatus.BAD_REQUEST, statusMessage: "Provider is required." });
  return startOAuth(event, provider);
});
