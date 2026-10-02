import { storeToRefs } from "pinia";
import {
  useRequestCacheStore,
  type RequestCacheEntry,
  type RequestHistoryEntry,
} from "~/stores/request-cache";
import type {
  ApiEnvelope,
  PortfolioApiData,
} from "~~/shared/types/portfolio-api";
import type { Ref } from "vue";
import { createPortfolioApi } from "~/lib/api/portfolio";

export function usePortfolioWorkspace(
  navigation: ReturnType<typeof usePortfolioNavigation>,
  initialTabResponse: Ref<ApiEnvelope<PortfolioApiData> | null | undefined>,
) {
  const {
    site,
    route,
    router,
    endpoints,
    activeId,
    activeEndpoint,
    projectFilter,
    requestUrl,
  } = navigation;
  const requestCache = useRequestCacheStore();
  const { history } = storeToRefs(requestCache);
  const clearHistory = () => requestCache.clear();
  const portfolioApi = createPortfolioApi(useNuxtApp().$api);
  if (initialTabResponse.value && !requestCache.get(requestUrl.value)) {
    requestCache.remember({
      requestKey: requestUrl.value,
      endpoint: activeId.value,
      response: initialTabResponse.value,
      headers: [],
      status: 200,
      duration: 0,
    });
  }
  const requestHost = ref("");
  const responseTab = ref<"preview" | "json" | "headers">("preview");
  const search = ref("");
  const searchInput = ref<HTMLInputElement>();
  function setSearchInput(element: unknown) {
    searchInput.value =
      element instanceof HTMLInputElement ? element : undefined;
  }
  const sidebarOpen = ref(false);
  const sidebarView = ref<"collections" | "history">("collections");
  const contentPane = ref<HTMLElement>();
  function setContentPane(element: unknown) {
    contentPane.value = element instanceof HTMLElement ? element : undefined;
  }
  const requestTabs = ref<HTMLElement>();
  function setRequestTabs(element: unknown) {
    requestTabs.value = element instanceof HTMLElement ? element : undefined;
  }
  const groupNames = computed(
    () => site.value?.groups.map((group) => group.label) ?? [],
  );
  const filteredEndpoints = computed(() =>
    endpoints.value.filter((endpoint) =>
      `${endpoint.slug} ${endpoint.label} ${endpoint.description}`
        .toLowerCase()
        .includes(search.value.toLowerCase().trim()),
    ),
  );
  const loading = ref(false);
  const response = shallowRef<ApiEnvelope<PortfolioApiData> | null>(
    initialTabResponse.value ?? null,
  );
  const activeResponseKey = ref(
    initialTabResponse.value ? requestUrl.value : "",
  );
  const responseHeaders = ref<[string, string][]>([]);
  const duration = ref<number | null>(null);
  const status = ref<number | null>(null);
  const requestError = ref("");
  const servedFromCache = ref(false);
  const responseJson = computed(() => JSON.stringify(response.value, null, 2));
  const responseBytes = computed(
    () => new TextEncoder().encode(responseJson.value).length,
  );
  let requestController: AbortController | undefined;
  let requestSequence = 0;
  let contactPrefetchController: AbortController | undefined;
  let contactPrefetchPromise:
    | Promise<RequestCacheEntry | undefined>
    | undefined;
  let contactIdleHandle: number | undefined;
  let contactFallbackTimer: ReturnType<typeof setTimeout> | undefined;
  const responseData = computed(() => response.value?.data ?? null);
  const showSkeleton = computed(() => loading.value && response.value === null);
  const activeTemplate = computed(
    () => responseData.value?.tab.template ?? activeEndpoint.value?.template,
  );
  const profile = usePortfolioProfile(responseData, site);
  const clipboard = usePortfolioClipboard();
  const projectDialog = usePortfolioProjectDialog((message) => {
    requestError.value = message;
  });

  useSeoMeta({
    title: () => site.value?.settings.seoTitle ?? "Portfolio",
    description: () => site.value?.settings.seoDescription ?? "",
    ogTitle: () => site.value?.settings.siteName ?? "Portfolio",
    ogDescription: () => site.value?.settings.seoDescription ?? "",
    twitterCard: "summary",
  });
  function revealActiveTab() {
    const container = requestTabs.value;
    const selected = container?.querySelector<HTMLElement>(
      '[aria-current="page"]',
    );
    if (!container || !selected) return;
    container.scrollTo({
      left:
        container.scrollLeft +
        selected.getBoundingClientRect().left -
        container.getBoundingClientRect().left -
        (container.clientWidth - selected.clientWidth) / 2,
      behavior: "instant",
    });
  }
  function resetPreviewScroll() {
    contentPane.value?.scrollTo({ top: 0, behavior: "instant" });
    if (window.matchMedia("(max-width: 767px)").matches) {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }
  async function navigate(id: string) {
    sidebarOpen.value = false;
    responseTab.value = "preview";
    await router.push({
      path: "/",
      query: id === site.value?.defaultTabSlug ? {} : { endpoint: id },
    });
    resetPreviewScroll();
  }
  async function openHistory(entry: RequestHistoryEntry) {
    const historyUrl = new URL(entry.requestKey, "http://portfolio.local");
    const category = historyUrl.searchParams.get("category");
    if (category === "backend") projectFilter.value = "Backend";
    else if (category === "fullstack") projectFilter.value = "Fullstack";
    else if (category === "all") projectFilter.value = "All projects";

    await navigate(entry.endpoint);
    await loadRequest(false, entry.requestKey);
  }
  function navigateTemplate(template: string) {
    const endpoint = endpoints.value.find((item) => item.template === template);
    if (endpoint) navigate(endpoint.slug);
  }
  function contactRequest() {
    const endpoint = endpoints.value.find((item) => item.slug === "contact");
    if (!endpoint) return null;
    return {
      endpoint: endpoint.slug,
      requestKey: `/api/portfolio/${encodeURIComponent(endpoint.slug)}`,
    };
  }
  function canPrefetch() {
    const connection = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    return (
      !connection?.saveData &&
      !["slow-2g", "2g"].includes(connection?.effectiveType ?? "")
    );
  }
  async function prefetchContact() {
    const contact = contactRequest();
    if (!contact || requestCache.get(contact.requestKey)) {
      return contact ? requestCache.get(contact.requestKey) : undefined;
    }

    contactPrefetchController = new AbortController();
    const start = performance.now();
    try {
      const result = await portfolioApi.raw(contact.requestKey, {
        signal: contactPrefetchController.signal,
      });
      if (!result.data) return undefined;
      return requestCache.prime({
        requestKey: contact.requestKey,
        endpoint: contact.endpoint,
        response: result.data,
        headers: Object.entries(result.headers).map(
          ([key, value]): [string, string] => [key, String(value)],
        ),
        status: result.status,
        duration: Math.round(performance.now() - start),
      });
    } catch {
      return undefined;
    } finally {
      contactPrefetchController = undefined;
    }
  }
  function scheduleContactPrefetch() {
    const contact = contactRequest();
    if (
      !contact ||
      !canPrefetch() ||
      requestCache.get(contact.requestKey) ||
      contactPrefetchPromise ||
      contactIdleHandle !== undefined ||
      contactFallbackTimer !== undefined
    ) {
      return;
    }

    const run = () => {
      contactIdleHandle = undefined;
      contactFallbackTimer = undefined;
      const promise = prefetchContact();
      contactPrefetchPromise = promise;
      void promise.then(() => {
        if (contactPrefetchPromise === promise)
          contactPrefetchPromise = undefined;
      });
    };
    if ("requestIdleCallback" in window) {
      contactIdleHandle = window.requestIdleCallback(run, { timeout: 1500 });
    } else {
      contactFallbackTimer = setTimeout(run, 700);
    }
  }
  watch(activeId, async () => {
    requestSequence++;
    requestController?.abort();
    loading.value = false;
    response.value = null;
    responseHeaders.value = [];
    duration.value = null;
    status.value = null;
    requestError.value = "";
    responseTab.value = "preview";
    await nextTick(revealActiveTab);
    if (import.meta.client && activeId.value) {
      await loadRequest();
      if (activeId.value === "me") scheduleContactPrefetch();
    }
  });
  function restoreCachedResponse(cached: RequestCacheEntry) {
    response.value = cached.response;
    activeResponseKey.value = cached.requestKey;
    status.value = cached.status;
    duration.value = cached.duration;
    responseHeaders.value = cached.headers;
    requestError.value = "";
    loading.value = false;
    servedFromCache.value = true;
  }
  async function loadRequest(force = false, preferredKey?: string) {
    const requestKey = preferredKey ?? requestUrl.value;
    if (!force) {
      const cached = requestCache.get(requestKey);
      if (cached) {
        requestSequence++;
        requestController?.abort();
        requestCache.ensureHistory(cached);
        restoreCachedResponse(cached);
        return;
      }

      const contact = contactRequest();
      if (contactPrefetchPromise && contact?.requestKey === requestKey) {
        loading.value = true;
        servedFromCache.value = false;
        const prefetched = await contactPrefetchPromise;
        if (requestUrl.value !== requestKey) return;
        loading.value = false;
        if (prefetched) {
          requestCache.ensureHistory(prefetched);
          restoreCachedResponse(prefetched);
          return;
        }
      }
    }

    if (loading.value) return;
    const sequence = ++requestSequence;
    const endpoint = activeId.value;
    requestController?.abort();
    requestController = new AbortController();
    loading.value = true;
    servedFromCache.value = false;
    requestError.value = "";
    status.value = null;
    duration.value = null;
    if (activeResponseKey.value !== requestKey) {
      response.value = null;
      responseHeaders.value = [];
      activeResponseKey.value = "";
    }
    const start = performance.now();
    try {
      const result = await portfolioApi.raw(requestKey, {
        signal: requestController.signal,
      });
      if (sequence !== requestSequence) return;
      response.value = result.data as ApiEnvelope<PortfolioApiData>;
      activeResponseKey.value = requestKey;
      status.value = result.status;
      responseHeaders.value = Object.entries(result.headers).map(
        ([key, value]): [string, string] => [key, String(value)],
      );
    } catch (error) {
      if (sequence !== requestSequence) return;
      const fetchError = error as { statusCode?: number };
      status.value = fetchError.statusCode ?? null;
      requestError.value =
        "The request could not be completed. Please try again.";
    } finally {
      if (sequence === requestSequence) {
        duration.value = Math.round(performance.now() - start);
        loading.value = false;
        if (response.value && status.value) {
          requestCache.remember({
            requestKey,
            endpoint,
            response: response.value,
            headers: responseHeaders.value,
            status: status.value,
            duration: duration.value,
          });
        } else {
          requestCache.recordFailure({
            requestKey,
            endpoint,
            status: status.value,
            duration: duration.value,
          });
        }
      }
    }
  }
  async function sendRequest() {
    await loadRequest(true);
  }
  function historyTime(createdAt: number) {
    return new Date(createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  function onTabKey(event: KeyboardEvent) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const tabs = ["preview", "json", "headers"] as const;
    const index = tabs.indexOf(responseTab.value);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? 2
          : (index + (event.key === "ArrowRight" ? 1 : 2)) % 3;
    responseTab.value = tabs[next]!;
    document.getElementById(`${responseTab.value}-tab`)?.focus();
  }
  function onShortcut(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      sidebarView.value = "collections";
      sidebarOpen.value = true;
      nextTick(() => searchInput.value?.focus());
    }
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      sendRequest();
    }
    if (event.key === "Escape") sidebarOpen.value = false;
  }
  onMounted(async () => {
    requestHost.value = window.location.host;
    revealActiveTab();
    window.addEventListener("keydown", onShortcut);
    if (activeId.value) {
      await loadRequest();
      if (activeId.value === "me") scheduleContactPrefetch();
    }
  });
  watch(projectFilter, () => {
    if (import.meta.client && activeTemplate.value === "project-list")
      loadRequest();
  });
  onBeforeUnmount(() => {
    requestController?.abort();
    contactPrefetchController?.abort();
    if (contactIdleHandle !== undefined && "cancelIdleCallback" in window) {
      window.cancelIdleCallback(contactIdleHandle);
    }
    if (contactFallbackTimer !== undefined) clearTimeout(contactFallbackTimer);
    window.removeEventListener("keydown", onShortcut);
  });
  const sidebar = reactive({
    sidebarOpen,
    sidebarView,
    search,
    navigateTemplate,
    header: computed(() => ({
      site: site.value,
      profile: profile.value,
      activeEndpoint: activeEndpoint.value,
    })),
    props: computed(() => ({
      site: site.value,
      profile: profile.value,
      endpoints: endpoints.value,
      groupNames: groupNames.value,
      filteredEndpoints: filteredEndpoints.value,
      activeId: activeId.value,
      navigate: navigate,
      history: history.value,
      openHistory: openHistory,
      historyTime: historyTime,
      clearHistory: clearHistory,
      setSearchInput: setSearchInput,
    })),
  });
  const request = reactive({
    projectFilter,
    responseTab,
    loading,
    controls: computed(() => ({
      endpoints: endpoints.value,
      activeId: activeId.value,
      navigate: navigate,
      requestHost: requestHost.value,
      requestUrl: requestUrl.value,
      loading: loading.value,
      sendRequest: sendRequest,
      onTabKey: onTabKey,
      requestError: requestError.value,
      status: status.value,
      servedFromCache: servedFromCache.value,
      duration: duration.value,
      responseBytes: responseBytes.value,
      responseJson: responseJson.value,
      setRequestTabs: setRequestTabs,
      copy: clipboard.copy,
    })),
  });
  const preview = computed(() => ({
    site: site.value,
    activeId: activeId.value,
    activeTemplate: activeTemplate.value,
    response: response.value,
    responseTab: responseTab.value,
    responseJson: responseJson.value,
    responseHeaders: responseHeaders.value,
    loading: loading.value,
    showSkeleton: showSkeleton.value,
    sendRequest: sendRequest,
    setContentPane: setContentPane,
    resetPreviewScroll: resetPreviewScroll,
    navigateTemplate: navigateTemplate,
    copy: clipboard.copy,
    inspectProject: projectDialog.inspect,
  }));
  return { sidebar, request, preview, projectDialog, clipboard };
}
