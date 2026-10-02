import type { ContentDraftPayload } from "~~/shared/types/admin-api";
import type { ApiClient, ApiMutationOptions } from "../client";

export function createContentApi(client: ApiClient) {
  return {
    pathContent: "/api/admin/content",
    saveDraft: (options: ApiMutationOptions<ContentDraftPayload>) =>
      client.request<unknown>("/api/admin/content/drafts", {
        ...options,
        method: "POST",
      }),
  };
}
