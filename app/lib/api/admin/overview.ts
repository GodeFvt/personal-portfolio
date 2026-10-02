import type { ApiClient } from "../client";

export function createOverviewApi(client: ApiClient) {
  return {
    pathSummary: "/api/admin/summary",
  };
}
