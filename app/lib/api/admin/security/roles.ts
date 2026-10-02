import type {
  CreateRolePayload,
  UpdateRolePayload,
} from "~~/shared/types/admin-api";
import type {
  ApiClient,
  ApiRequestOptions,
  ApiMutationOptions,
} from "../../client";

export function createSecurityRolesApi(client: ApiClient) {
  return {
    pathRoles: "/api/admin/security/roles",
    createRole: (options: ApiMutationOptions<CreateRolePayload>) =>
      client.request<unknown>("/api/admin/security/roles", {
        ...options,
        method: "POST",
      }),
    updateRole: (id: string, options: ApiMutationOptions<UpdateRolePayload>) =>
      client.request<unknown>(`/api/admin/security/roles/${id}`, {
        ...options,
        method: "PATCH",
      }),
    deleteRole: (id: string, options: ApiRequestOptions = {}) =>
      client.request<unknown>(`/api/admin/security/roles/${id}`, {
        ...options,
        method: "DELETE",
      }),
  };
}
