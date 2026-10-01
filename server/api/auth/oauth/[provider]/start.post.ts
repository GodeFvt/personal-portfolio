import { startOAuth } from "../../../../services/oauth-flow";

export default defineEventHandler((event) => {
  const provider = getRouterParam(event, "provider");
  if (!provider) throw createError({ statusCode: 400, statusMessage: "Provider is required." });
  return startOAuth(event, provider);
});
