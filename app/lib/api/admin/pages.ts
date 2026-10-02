import type { ApiClient, ApiMutationOptions } from "../client";
import type { PageContentPayload } from "~/types/admin/pages";
export function createPagesApi(client: ApiClient) {
  return {
    pathPages: "/api/admin/content/pages",
    saveDraft: (id: string, options: ApiMutationOptions<PageContentPayload>) =>
      client.request<unknown>(
        `/api/admin/content/pages/${encodeURIComponent(id)}/draft`,
        { ...options, method: "POST" },
      ),
  };
}
