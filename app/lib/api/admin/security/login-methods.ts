import type {
  ProviderDraftPayload,
  ProviderActivationPayload,
  ProviderDisablePayload,
} from "~~/shared/types/admin-api";
import type {
  ApiClient,
  ApiRequestOptions,
  ApiMutationOptions,
} from "../../client";

export function createSecurityLoginMethodsApi(client: ApiClient) {
  return {
    pathProviders: "/api/admin/security/providers",
    saveProviderDraft: (
      id: string,
      options: ApiMutationOptions<ProviderDraftPayload>,
    ) =>
      client.request<unknown>(`/api/admin/security/providers/${id}`, {
        ...options,
        method: "PATCH",
      }),
    activate: (
      id: string,
      options: ApiMutationOptions<ProviderActivationPayload>,
    ) =>
      client.request<unknown>(`/api/admin/security/providers/${id}/activate`, {
        ...options,
        method: "POST",
      }),
    disable: (
      id: string,
      options: ApiMutationOptions<ProviderDisablePayload>,
    ) =>
      client.request<unknown>(`/api/admin/security/providers/${id}/disable`, {
        ...options,
        method: "POST",
      }),
    unlinkIdentity: (id: string, options: ApiRequestOptions = {}) =>
      client.request<{ data: { loggedOut: boolean } }>(
        `/api/admin/security/identities/${id}`,
        { ...options, method: "DELETE" },
      ),
  };
}
