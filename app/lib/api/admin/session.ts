import type { ApiClient, ApiRequestOptions } from "../client";
import type { AdminSessionEnvelope } from "~/types/admin/session";

export function createSessionApi(client: ApiClient) {
  return {
    getSession: (options: ApiRequestOptions = {}) =>
      client.request<AdminSessionEnvelope>("/api/admin/session", {
        ...options,
        method: "GET",
      }),
  };
}
