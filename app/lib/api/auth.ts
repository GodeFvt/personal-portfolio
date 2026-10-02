import type {
  LoginPayload,
  OAuthStartPayload,
  InvitationPreviewPayload,
} from "~~/shared/types/admin-api";
import type {
  ApiClient,
  ApiRequestOptions,
  ApiMutationOptions,
} from "./client";
import type { PreviewResponse } from "~/types/admin/accept-invitation";

export function createAuthApi(client: ApiClient) {
  return {
    previewInvitation: (
      options: ApiMutationOptions<InvitationPreviewPayload>,
    ) =>
      client.request<PreviewResponse>("/api/auth/invitations/preview", {
        ...options,
        method: "POST",
      }),
    startOAuth: (
      provider: string,
      options: ApiMutationOptions<OAuthStartPayload>,
    ) =>
      client.request<{ data: { authorizationUrl: string } }>(
        `/api/auth/oauth/${provider}/start`,
        { ...options, method: "POST" },
      ),
    providers: "/api/auth/providers",
    login: (options: ApiMutationOptions<LoginPayload>) =>
      client.request<unknown>("/api/auth/login", {
        ...options,
        method: "POST",
      }),
    logout: (options: ApiRequestOptions = {}) =>
      client.request<unknown>("/api/auth/logout", {
        ...options,
        method: "POST",
      }),
  };
}
