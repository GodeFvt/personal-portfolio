import { defineStore } from "pinia";
import { ref } from "vue";
import type { ApiEnvelope, PortfolioApiData } from "~~/shared/types/portfolio-api";

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

export const useRequestCacheStore = defineStore("request-cache", () => {
  const responses = ref<Record<string, RequestCacheEntry>>({});
  const history = ref<RequestHistoryEntry[]>([]);
  let nextHistoryId = 0;

  function get(requestKey: string) {
    return responses.value[requestKey];
  }

  function remember(entry: Omit<RequestCacheEntry, "fetchedAt">) {
    const cached: RequestCacheEntry = { ...entry, fetchedAt: Date.now() };
    responses.value[entry.requestKey] = cached;
    addHistory({
      requestKey: entry.requestKey,
      endpoint: entry.endpoint,
      status: entry.status,
      duration: entry.duration,
    });
    return cached;
  }

  function recordFailure(entry: Omit<RequestHistoryEntry, "id" | "createdAt">) {
    addHistory(entry);
  }

  function addHistory(entry: Omit<RequestHistoryEntry, "id" | "createdAt">) {
    nextHistoryId = Math.max(Date.now(), nextHistoryId + 1);
    history.value.unshift({
      ...entry,
      id: nextHistoryId,
      createdAt: Date.now(),
    });
    history.value = history.value.slice(0, 12);
  }

  function clear() {
    responses.value = {};
    history.value = [];
  }

  return { responses, history, get, remember, recordFailure, clear };
});
