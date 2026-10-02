import type { NavigationDraftPayload } from "~~/shared/types/admin-api";
import type { ApiClient, ApiMutationOptions } from "../client";

export function createNavigationApi(client: ApiClient) {
  return {
    pathNavigation: "/api/admin/navigation",
    saveDraft: (options: ApiMutationOptions<NavigationDraftPayload>) =>
      client.request<unknown>("/api/admin/navigation/drafts", {
        ...options,
        method: "POST",
      }),
  };
}
