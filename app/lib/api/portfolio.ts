import type { ApiClient, ApiRequestOptions } from "./client";
import type {
  ApiEnvelope,
  PortfolioApiData,
  PublicProject,
} from "~~/shared/types/portfolio-api";

export function createPortfolioApi(client: ApiClient) {
  return {
    paths: { site: "/api/site" },
    raw: (path: string, options?: ApiRequestOptions) =>
      client.raw<ApiEnvelope<PortfolioApiData>>(path, options),
    project: (slug: string) =>
      client.request<ApiEnvelope<PublicProject>>(
        `/api/projects/${encodeURIComponent(slug)}`,
      ),
  };
}
