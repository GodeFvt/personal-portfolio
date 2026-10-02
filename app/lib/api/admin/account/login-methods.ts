import type { ApiClient, ApiRequestOptions } from "../../client";

export function createAccountLoginMethodsApi(client: ApiClient) {
  return {
    pathLoginMethods: "/api/admin/account/login-methods",
    unlinkIdentity: (id: string, options: ApiRequestOptions = {}) =>
      client.request<{ data: { loggedOut: boolean } }>(
        `/api/admin/security/identities/${id}`,
        { ...options, method: "DELETE" },
      ),
  };
}
