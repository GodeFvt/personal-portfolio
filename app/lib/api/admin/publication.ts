import type { PublishPayload } from "~~/shared/types/admin-api";
import type { ApiClient, ApiMutationOptions } from "../client";

export function createPublicationApi(client: ApiClient) {
  return {
    publish: (options: ApiMutationOptions<PublishPayload>) =>
      client.request<unknown>("/api/admin/publish", {
        ...options,
        method: "POST",
      }),
  };
}
