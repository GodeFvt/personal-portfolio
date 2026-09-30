export {
  permissionCatalog,
  systemRoleTemplates,
  type PermissionKey,
} from "~~/shared/auth/permissions";

export const securitySensitivePermissions = new Set([
  "users.manage",
  "roles.create",
  "roles.update",
  "roles.assign",
  "auth.providers.manage",
  "auth.policy.manage",
  "sessions.revoke",
  "ownership.manage",
]);
