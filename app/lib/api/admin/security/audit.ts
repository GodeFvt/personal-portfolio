import type { ApiClient } from "../../client";

export function createSecurityAuditApi(client: ApiClient) {
  return {
    pathAudit: "/api/admin/security/audit",
  };
}
