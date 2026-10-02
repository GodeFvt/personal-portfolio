import type {
  InvitationPayload,
  UpdateUserPayload,
} from "~~/shared/types/admin-api";
import type {
  ApiClient,
  ApiRequestOptions,
  ApiMutationOptions,
} from "../../client";

export function createSecurityUsersApi(client: ApiClient) {
  return {
    pathUsers: "/api/admin/security/users",
    pathRoles: "/api/admin/security/roles",
    invite: (options: ApiMutationOptions<InvitationPayload>) =>
      client.request<{ data: { acceptUrl: string } }>(
        "/api/admin/security/invitations",
        { ...options, method: "POST" },
      ),
    updateUser: (id: string, options: ApiMutationOptions<UpdateUserPayload>) =>
      client.request<unknown>(`/api/admin/security/users/${id}`, {
        ...options,
        method: "PATCH",
      }),
    revokeInvitation: (id: string, options: ApiRequestOptions = {}) =>
      client.request<unknown>(`/api/admin/security/invitations/${id}`, {
        ...options,
        method: "DELETE",
      }),
  };
}
