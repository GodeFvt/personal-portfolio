import type {
  ApiEnvelope,
  PortfolioApiData,
} from "~~/shared/types/portfolio-api";

export interface RequestCacheEntry {
  requestKey: string;
  endpoint: string;
  response: ApiEnvelope<PortfolioApiData>;
  headers: [string, string][];
  status: number;
  duration: number;
  fetchedAt: number;
}

export interface RequestHistoryEntry {
  id: number;
  requestKey: string;
  endpoint: string;
  status: number | null;
  duration: number;
  createdAt: number;
}
