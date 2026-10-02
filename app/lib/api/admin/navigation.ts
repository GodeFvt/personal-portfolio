import type { NavigationDraftPayload } from "~~/shared/types/admin-api";
import type { ApiClient, ApiMutationOptions } from "../client";

export function createNavigationApi(client: ApiClient) {
  return {
    pathNavigation: "/api/admin/navigation",
    deleteTab: (
      id: string,
      options: ApiMutationOptions<{ expectedVersion: number }>,
    ) =>
      client.request<{ data: { deleted: boolean } }>(
        `/api/admin/navigation/tabs/${encodeURIComponent(id)}`,
        { ...options, method: "DELETE" },
      ),
    saveDraft: (options: ApiMutationOptions<NavigationDraftPayload>) =>
      client.request<unknown>("/api/admin/navigation/drafts", {
        ...options,
        method: "POST",
      }),
  };
}
