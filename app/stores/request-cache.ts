import { defineStore } from "pinia";
import { ref } from "vue";
import type {
  RequestCacheEntry,
  RequestHistoryEntry,
} from "~/types/request-cache";

export type {
  RequestCacheEntry,
  RequestHistoryEntry,
} from "~/types/request-cache";

export const useRequestCacheStore = defineStore("request-cache", () => {
  const responses = ref<Record<string, RequestCacheEntry>>({});
  const history = ref<RequestHistoryEntry[]>([]);
  let nextHistoryId = 0;

  function get(requestKey: string) {
    return responses.value[requestKey];
  }

  function prime(entry: Omit<RequestCacheEntry, "fetchedAt">) {
    const cached: RequestCacheEntry = { ...entry, fetchedAt: Date.now() };
    responses.value[entry.requestKey] = cached;
    return cached;
  }

  function remember(entry: Omit<RequestCacheEntry, "fetchedAt">) {
    const cached = prime(entry);
    addHistory({
      requestKey: entry.requestKey,
      endpoint: entry.endpoint,
      status: entry.status,
      duration: entry.duration,
    });
    return cached;
  }

  function ensureHistory(entry: RequestCacheEntry) {
    if (history.value.some((item) => item.requestKey === entry.requestKey))
      return;
    addHistory({
      requestKey: entry.requestKey,
      endpoint: entry.endpoint,
      status: entry.status,
      duration: entry.duration,
    });
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

  return {
    responses,
    history,
    get,
    prime,
    remember,
    ensureHistory,
    recordFailure,
    clear,
  };
});
