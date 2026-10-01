import { finishOAuth } from "../../../../services/oauth-flow";

export default defineEventHandler((event) => {
  const provider = getRouterParam(event, "provider");
  if (!provider) return sendRedirect(event, "/admin/login?oauth=invalid");
  return finishOAuth(event, provider);
});
