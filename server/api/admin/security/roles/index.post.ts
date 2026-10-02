import { HttpStatus } from "~~/server/utils/http-status";
import { ApiErrorCode } from "~~/shared/schemas/api";
import { createRoleSchema } from "~~/shared/schemas/admin-security";
import { apiData, apiError } from "../../../../utils/api-response";
import { requireCsrf, requirePermission } from "../../../../utils/admin-auth";
import { useDatabase } from "../../../../utils/db";
import { assertDelegablePermissions } from "../../../../services/access-control";

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");
  let admin;
  try {
    await requireCsrf(event);
    admin = await requirePermission(event, "roles.create");
  } catch (error) {
    const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : HttpStatus.UNAUTHORIZED;
    return apiError(event, status, { code: status === HttpStatus.FORBIDDEN ? ApiErrorCode.PERMISSION_DENIED : ApiErrorCode.AUTH_REQUIRED, message: status === HttpStatus.FORBIDDEN ? "Request rejected." : "Authentication required." });
  }

  const parsed = createRoleSchema.safeParse(await readBody(event));
  if (!parsed.success) return apiError(event, HttpStatus.BAD_REQUEST, { code: ApiErrorCode.VALIDATION_ERROR, message: "Please check the submitted fields.", fields: parsed.error.flatten().fieldErrors });

  try {
    assertDelegablePermissions(admin.permissions, parsed.data.permissionKeys);
    const role = await useDatabase().$transaction(async (transaction) => {
      const created = await transaction.role.create({
        data: {
          key: parsed.data.key,
          name: parsed.data.name,
          description: parsed.data.description || null,
          permissions: { create: [...new Set(parsed.data.permissionKeys)].map((permissionKey) => ({ permissionKey })) },
        },
        include: { permissions: true, _count: { select: { users: true } } },
      });
      await transaction.auditLog.create({
        data: { actorId: admin.user.id, action: "role.created", entityType: "Role", entityId: created.id, metadata: { key: created.key, permissions: parsed.data.permissionKeys, requestId: event.context.requestId } },
      });
      return created;
    });
    return apiData({ role });
  } catch (error) {
    const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : HttpStatus.INTERNAL_SERVER_ERROR;
    if (status === HttpStatus.FORBIDDEN) return apiError(event, HttpStatus.FORBIDDEN, { code: ApiErrorCode.DELEGATION_DENIED, message: "A role cannot grant permissions you do not hold." });
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return apiError(event, HttpStatus.CONFLICT, { code: ApiErrorCode.ROLE_KEY_TAKEN, message: "That role key is already in use." });
    throw error;
  }
});
