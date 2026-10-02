import { HttpStatus } from "~~/server/utils/http-status";
import { ApiErrorCode } from "~~/shared/schemas/api";
import { apiData, apiError } from "../../../../utils/api-response";
import { requirePermission } from "../../../../utils/admin-auth";
import { useDatabase } from "../../../../utils/db";
import { permissionCatalog } from "../../../../auth/permissions";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");
  try { await requirePermission(event, "roles.read"); }
  catch (error) {
    const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : HttpStatus.UNAUTHORIZED;
    return apiError(event, status, { code: status === HttpStatus.FORBIDDEN ? ApiErrorCode.PERMISSION_DENIED : ApiErrorCode.AUTH_REQUIRED, message: status === HttpStatus.FORBIDDEN ? "Permission denied." : "Authentication required." });
  }
  const roles = await useDatabase().role.findMany({
    orderBy: [{ isProtected: "desc" }, { name: "asc" }],
    select: {
      id: true, key: true, name: true, description: true, isSystem: true, isProtected: true, version: true,
      permissions: { orderBy: { permissionKey: "asc" }, select: { permissionKey: true } },
      _count: { select: { users: true } },
    },
  });
  return apiData({ roles, permissionCatalog });
});
