import { timingSafeEqual } from "node:crypto";
import { cleanupOrphanMedia } from "../../services/media";
import { apiData, apiError } from "../../utils/api-response";
import { getServerEnv } from "../../utils/env";

export default defineEventHandler(async (event) => {
  const configured = getServerEnv().SCHEDULED_JOB_SECRET;
  const received = getHeader(event, "authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!configured || Buffer.byteLength(configured) !== Buffer.byteLength(received) || !timingSafeEqual(Buffer.from(configured), Buffer.from(received))) {
    return apiError(event, 401, { code: "AUTH_REQUIRED", message: "Job authorization failed." });
  }
  return apiData(await cleanupOrphanMedia());
});
