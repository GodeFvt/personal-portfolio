import type { EndpointDefinition, EndpointId } from "../data/portfolio";

export type ResponsePaneTab = "preview" | "json" | "headers";

export interface RequestLog {
  id: number;
  endpointId: EndpointId;
  latency: number;
  executedAt: string;
}

export interface RuntimeResponse {
  ok: true;
  status: number;
  method: "GET";
  path: EndpointId;
  servedAt: string;
  latencyMs: number;
  sourceCount: number;
  headers: Record<string, string>;
  data: unknown;
}

export type CollectionGroupId = "profile" | "work" | "contact";

export interface CollectionGroup {
  id: CollectionGroupId;
  label: string;
  endpoints: EndpointId[];
}

export const collectionGroups: CollectionGroup[] = [
  { id: "profile", label: "Profile", endpoints: ["/me", "/about", "/skills"] },
  { id: "work", label: "Projects", endpoints: ["/project"] },
  { id: "contact", label: "Reach", endpoints: ["/contact"] },
];

export function isEndpointId(value: string): value is EndpointId {
  return ["/me", "/project", "/about", "/skills", "/contact"].includes(value);
}

export function buildRuntimeResponse(
  endpoint: EndpointDefinition,
  log: RequestLog | null,
): RuntimeResponse {
  const servedAt =
    log?.endpointId === endpoint.id ? log.executedAt : new Date().toISOString();
  const latencyMs =
    log?.endpointId === endpoint.id ? log.latency : endpoint.baseLatency;

  return {
    ok: true,
    status: 200,
    method: endpoint.method,
    path: endpoint.id,
    servedAt,
    latencyMs,
    sourceCount: endpoint.sources.length,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-portfolio-badge": endpoint.badge,
      "x-portfolio-sources": endpoint.sources.join(", "),
      "x-portfolio-runtime": "portfolio",
    },
    data: endpoint.data,
  };
}
