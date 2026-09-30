import { apiData } from "../../utils/api-response";
import { useDatabase } from "../../utils/db";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");
  const providers = await useDatabase().oAuthProvider.findMany({
    where: { enabled: true, activeConfigVersion: { not: null } },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: { key: true, type: true, label: true },
  });
  return apiData({ password: { enabled: true }, providers });
});
