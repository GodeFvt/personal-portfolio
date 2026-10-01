<script setup lang="ts">
import { storeToRefs } from "pinia";
import {
  useRequestCacheStore,
  type RequestCacheEntry,
  type RequestHistoryEntry,
} from "~/stores/request-cache";
import type {
  ApiEnvelope,
  PortfolioApiData,
  PublicProfile,
  PublicProject,
  SiteApiData,
} from "~~/shared/types/portfolio-api";

const route = useRoute();
const router = useRouter();
const requestCache = useRequestCacheStore();
const { history } = storeToRefs(requestCache);
const { data: siteResponse, error: siteError } = await useFetch<ApiEnvelope<SiteApiData>>("/api/site", {
  key: "public-site",
  retry: 0,
});
const site = computed(() => siteResponse.value?.data ?? null);
const endpoints = computed(() =>
  (site.value?.groups ?? []).flatMap((group) =>
    group.tabs.map((tab) => ({ ...tab, group: group.label })),
  ),
);
const activeId = computed(() => {
  const requested = typeof route.query.endpoint === "string" ? route.query.endpoint : "";
  if (endpoints.value.some((endpoint) => endpoint.slug === requested)) return requested;
  return site.value?.defaultTabSlug ?? endpoints.value[0]?.slug ?? "";
});
const activeEndpoint = computed(() =>
  endpoints.value.find((endpoint) => endpoint.slug === activeId.value),
);
const projectFilter = ref("All projects");
const requestUrl = computed(() => {
  const path = `/api/portfolio/${encodeURIComponent(activeId.value)}`;
  if (activeEndpoint.value?.template !== "project-list") return path;
  const category =
    projectFilter.value === "Backend"
      ? "backend"
      : projectFilter.value === "Fullstack"
        ? "fullstack"
        : "all";
  return `${path}?page=1&perPage=50&category=${category}`;
});
const { data: initialTabResponse } = await useFetch<ApiEnvelope<PortfolioApiData>>(
  requestUrl.value,
  {
    key: `initial-tab-${activeId.value}`,
    retry: 0,
  },
);
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
const sidebarOpen = ref(false);
const sidebarView = ref<"collections" | "history">("collections");
const contentPane = ref<HTMLElement>();
const requestTabs = ref<HTMLElement>();
const groupNames = computed(() => site.value?.groups.map((group) => group.label) ?? []);
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
const activeResponseKey = ref(initialTabResponse.value ? requestUrl.value : "");
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
let contactPrefetchPromise: Promise<RequestCacheEntry | undefined> | undefined;
let contactIdleHandle: number | undefined;
let contactFallbackTimer: ReturnType<typeof setTimeout> | undefined;
let copiedTimer: ReturnType<typeof setTimeout> | undefined;
const copyNotice = ref("");
const dialog = ref<HTMLDialogElement>();
const selectedProject = ref<PublicProject | null>(null);
const responseData = computed(() => response.value?.data ?? null);
const showSkeleton = computed(() => loading.value && response.value === null);
const activeTemplate = computed(
  () => responseData.value?.tab.template ?? activeEndpoint.value?.template,
);
const emptyProfile: PublicProfile = {
  name: "",
  alias: "",
  role: "",
  email: "",
  bio: "",
  focus: "",
  interests: [],
  location: "",
  portraitUrl: null,
  resumeUrl: null,
  education: [],
  socialLinks: [],
};
const profile = computed(() => {
  const value = responseData.value?.content.profile ?? site.value?.profile ?? emptyProfile;
  const social = (type: string) =>
    value.socialLinks.find((link) => link.type === type)?.url ?? "";
  return {
    ...value,
    github: social("github"),
    linkedin: social("linkedin"),
    resume: value.resumeUrl ?? social("resume"),
    portrait: value.portraitUrl,
  };
});
const projects = computed(
  () => responseData.value?.content.projects ?? responseData.value?.items ?? [],
);
const displayedProjects = computed(() => projects.value);
const archive = computed(() => responseData.value?.content.archive ?? []);
const experience = computed(() => responseData.value?.content.experience ?? []);
const skillGroups = computed(() => responseData.value?.content.skillGroups ?? []);
function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}
function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function blockProps(variant?: string, type?: string) {
  const block = responseData.value?.blocks.find((item) => {
    if (type && item.type !== type) return false;
    return variant ? item.props.variant === variant : true;
  });
  return block?.props ?? {};
}
const pageHeading = computed(() => {
  const props = blockProps("heading", "text");
  return {
    kicker: stringValue(props.kicker),
    heading: stringValue(props.heading),
    description: stringValue(props.content || props.description),
  };
});
const introductionHero = computed(() => {
  const props = blockProps("hero", "text");
  const primaryAction = objectValue(props.primaryAction);
  const secondaryAction = objectValue(props.secondaryAction);
  return {
    kicker: stringValue(props.kicker),
    heading: stringValue(props.heading),
    description: stringValue(props.description),
    primaryAction: stringValue(primaryAction.label),
    secondaryAction: stringValue(secondaryAction.label),
  };
});
const introductionHeadingLines = computed(() => {
  const heading = introductionHero.value.heading.trim();
  if (heading === "A little human. A lot of backend.") {
    return ["A little human.", "A lot of backend."];
  }
  return [heading];
});
const introductionOrigin = computed(() => {
  const props = blockProps("origin", "text");
  return {
    kicker: stringValue(props.kicker),
    heading: stringValue(props.heading),
    description: stringValue(props.content),
  };
});
const introductionFocus = computed(() => {
  const props = blockProps("focus-strip", "skill-group");
  return {
    heading: stringValue(props.heading),
    items: Array.isArray(props.items)
      ? props.items.filter((item): item is string => typeof item === "string")
      : [],
  };
});
const introductionProjectsHeading = computed(() => {
  const props = blockProps(undefined, "project-grid");
  const heading =
    props.heading && typeof props.heading === "object" && !Array.isArray(props.heading)
      ? (props.heading as Record<string, unknown>)
      : {};
  return {
    heading: stringValue(heading.heading),
    description: stringValue(heading.description),
  };
});
const contactSignoff = computed(() =>
  stringValue(blockProps("signoff", "text").content),
);
const linkListContent = computed(() => {
  const props = blockProps(undefined, "link-list");
  const rawLinks = Array.isArray(props.links) ? props.links : [];
  return {
    heading: stringValue(props.heading),
    links: rawLinks
      .map(objectValue)
      .map((link) => ({
        label: stringValue(link.label),
        url: stringValue(link.url),
        description: stringValue(link.description),
      }))
      .filter((link) => link.label && link.url),
  };
});
const contactSocialLinks = computed(() =>
  linkListContent.value.links.filter((link) => !link.url.startsWith("mailto:")),
);
function linkIcon(url: string) {
  if (url.includes("github.com")) return "i-lucide-github";
  if (url.includes("linkedin.com")) return "i-lucide-linkedin";
  if (url.endsWith(".pdf")) return "i-lucide-file-down";
  return "i-lucide-link";
}
const selectedStack = ref(0);
const selectedJob = ref(0);

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
  return !connection?.saveData && !["slow-2g", "2g"].includes(connection?.effectiveType ?? "");
}
async function prefetchContact() {
  const contact = contactRequest();
  if (!contact || requestCache.get(contact.requestKey)) {
    return contact ? requestCache.get(contact.requestKey) : undefined;
  }

  contactPrefetchController = new AbortController();
  const start = performance.now();
  try {
    const result = await $fetch.raw<ApiEnvelope<PortfolioApiData>>(contact.requestKey, {
      signal: contactPrefetchController.signal,
      retry: 0,
    });
    if (!result._data) return undefined;
    return requestCache.prime({
      requestKey: contact.requestKey,
      endpoint: contact.endpoint,
      response: result._data,
      headers: [...result.headers.entries()],
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
      if (contactPrefetchPromise === promise) contactPrefetchPromise = undefined;
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
  selectedStack.value = 0;
  selectedJob.value = 0;
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
    const result = await $fetch.raw(requestKey, {
      signal: requestController.signal,
      retry: 0,
    });
    if (sequence !== requestSequence) return;
    response.value = result._data as ApiEnvelope<PortfolioApiData>;
    activeResponseKey.value = requestKey;
    status.value = result.status;
    responseHeaders.value = [...result.headers.entries()];
  } catch (error) {
    if (sequence !== requestSequence) return;
    const fetchError = error as { statusCode?: number };
    status.value = fetchError.statusCode ?? null;
    requestError.value = "The request could not be completed. Please try again.";
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
async function copy(text: string, label: string) {
  clearTimeout(copiedTimer);
  try {
    await navigator.clipboard.writeText(text);
    copyNotice.value = `${label} copied`;
  } catch {
    copyNotice.value = "Copy unavailable. Please select and copy the text.";
  }
  copiedTimer = setTimeout(() => {
    copyNotice.value = "";
  }, 3000);
}
async function inspectProject(slug: string) {
  try {
    const result = await $fetch<ApiEnvelope<PublicProject>>(
      `/api/projects/${encodeURIComponent(slug)}`,
      { retry: 0 },
    );
    selectedProject.value = result.data;
    await nextTick();
    dialog.value?.showModal();
  } catch {
    requestError.value = "Project details could not be loaded.";
  }
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
  if (import.meta.client && activeTemplate.value === "project-list") loadRequest();
});
onBeforeUnmount(() => {
  requestController?.abort();
  contactPrefetchController?.abort();
  if (contactIdleHandle !== undefined && "cancelIdleCallback" in window) {
    window.cancelIdleCallback(contactIdleHandle);
  }
  if (contactFallbackTimer !== undefined) clearTimeout(contactFallbackTimer);
  clearTimeout(copiedTimer);
  window.removeEventListener("keydown", onShortcut);
});
</script>

<template>
  <div class="ws-app">
    <a class="ws-skip" href="#workspace-content">Skip to preview</a>
    <header class="ws-topbar">
      <div class="ws-brand">
        <button
          class="ws-mobile-menu ws-icon"
          aria-label="Toggle collections"
          :aria-expanded="sidebarOpen"
          aria-controls="ws-sidebar"
          @click="sidebarOpen = !sidebarOpen"
        >
          <UIcon
            :name="sidebarOpen ? 'i-lucide-x' : 'i-lucide-panel-left'"
          /></button
        ><NuxtLink to="/" class="ws-logo"
          ><span class="ws-logo-mark">p<span>:</span></span
          ><strong>{{ site?.settings.logoText }}</strong></NuxtLink
        >
      </div>
      <div class="ws-top-context">
        <UIcon name="i-lucide-folder-open" /><span>{{ site?.settings.siteName }}</span
        ><UIcon name="i-lucide-chevron-right" /><span>{{ activeEndpoint?.label }}</span>
      </div>
      <div class="ws-top-actions">
        <ThemeControl />
        <a
          :href="profile.github"
          target="_blank"
          rel="noopener noreferrer"
          class="ws-icon"
          aria-label="View GitHub profile"
          ><UIcon name="i-lucide-github" /></a
        ><a
          v-if="profile.resume"
          :href="profile.resume"
          target="_blank"
          rel="noopener"
          class="ws-resume"
          >Résumé <UIcon name="i-lucide-arrow-down-to-line"
        /></a>
      </div>
    </header>
    <div class="ws-layout">
      <button
        v-if="sidebarOpen"
        class="ws-sidebar-scrim"
        aria-label="Close collections"
        @click="sidebarOpen = false"
      />
      <nav class="ws-rail" aria-label="Workspace tools">
        <button
          class="ws-rail-button"
          :class="{ active: sidebarView === 'collections' }"
          aria-label="Collections"
          @click="sidebarView = 'collections'"
        >
          <UIcon name="i-lucide-folders" /></button
        ><button
          class="ws-rail-button"
          :class="{ active: sidebarView === 'history' }"
          aria-label="Request history"
          @click="sidebarView = 'history'"
        >
          <UIcon name="i-lucide-history" /></button
        ><span class="ws-rail-separator" /><button
          class="ws-rail-button"
          aria-label="Open introduction"
          @click="navigateTemplate('introduction')"
        >
          <UIcon name="i-lucide-fingerprint" /></button
        ><button
          class="ws-rail-button"
          aria-label="Open contact"
          @click="navigateTemplate('contact')"
        >
          <UIcon name="i-lucide-at-sign" />
        </button>
      </nav>
      <aside
        id="ws-sidebar"
        class="ws-sidebar"
        :class="{ 'ws-sidebar-open': sidebarOpen }"
      >
        <div class="ws-sidebar-title">
          <strong>{{
            sidebarView === "collections" ? "Collections" : "Request history"
          }}</strong
          ><UIcon
            :name="
              sidebarView === 'collections'
                ? 'i-lucide-folder-open'
                : 'i-lucide-history'
            "
          />
        </div>
        <div class="ws-sidebar-mobile-tabs">
          <button
            :aria-pressed="sidebarView === 'collections'"
            @click="sidebarView = 'collections'"
          >
            Collections</button
          ><button
            :aria-pressed="sidebarView === 'history'"
            @click="sidebarView = 'history'"
          >
            History
          </button>
        </div>
        <template v-if="sidebarView === 'collections'">
          <label class="ws-search"
            ><UIcon name="i-lucide-search" /><input
              ref="searchInput"
              v-model="search"
              type="search"
              aria-label="Find an endpoint"
              placeholder="Find an endpoint…"
            /><kbd>⌘ K</kbd></label
          >
          <div class="ws-collection-root">
            <UIcon name="i-lucide-chevron-down" /><UIcon
              name="i-lucide-folder"
            /><span>{{ site?.settings.siteName }}</span
            ><span class="ws-count">{{ endpoints.length }}</span>
          </div>
          <nav class="ws-collections" aria-label="Portfolio endpoints">
            <template v-for="group in groupNames" :key="group"
              ><div
                v-if="
                  filteredEndpoints.some((endpoint) => endpoint.group === group)
                "
                class="ws-collection-group"
              >
                <p>{{ group }}</p>
                <button
                  v-for="endpoint in filteredEndpoints.filter(
                    (item) => item.group === group,
                  )"
                  :key="endpoint.id"
                  class="ws-endpoint"
                  :class="{ active: activeId === endpoint.slug }"
                  :aria-current="activeId === endpoint.slug ? 'page' : undefined"
                  @click="navigate(endpoint.slug)"
                >
                  <span class="ws-method mono">GET</span
                  ><span class="mono">/{{ endpoint.slug }}</span>
                </button></div
            ></template>
            <div v-if="!filteredEndpoints.length" class="ws-empty-search">
              <p>No matching endpoints.</p>
              <button @click="search = ''">Clear search</button>
            </div>
          </nav>
        </template>
        <div v-else class="ws-history">
          <div v-if="!history.length" class="ws-history-empty">
            <UIcon name="i-lucide-history" /><strong>No requests yet.</strong>
            <p>
              Press Send to make a real request. Your session history will
              appear here.
            </p>
          </div>
          <button
            v-for="entry in history"
            :key="entry.id"
            @click="openHistory(entry)"
          >
            <span><b class="ws-method mono">GET</b> /{{ entry.endpoint }}</span
            ><small
              >{{ entry.status ?? "Error" }} · {{ entry.duration }} ms
              <time>{{ historyTime(entry.createdAt) }}</time></small
            ></button
          ><button
            v-if="history.length"
            class="ws-clear-history"
            @click="requestCache.clear()"
          >
            Clear history
          </button>
        </div>
        <div class="ws-sidebar-bottom">
          <div class="ws-owner">
            <img
              v-if="profile.portrait"
              :src="profile.portrait"
              alt=""
              width="32"
              height="32"
            />
            <div>
              <strong>{{ profile.name }}</strong
              ><span>{{ profile.role }}</span>
            </div>
          </div>
          <p>{{ profile.bio }}</p>
          <a :href="`mailto:${profile.email}`"
            >Let's connect <UIcon name="i-lucide-arrow-up-right"
          /></a>
        </div>
      </aside>
      <main class="ws-main">
        <nav
          ref="requestTabs"
          class="ws-request-tabs"
          aria-label="Open endpoints"
        >
          <button
            v-for="endpoint in endpoints"
            :key="endpoint.id"
            :class="{ active: activeId === endpoint.slug }"
            :aria-current="activeId === endpoint.slug ? 'page' : undefined"
            @click="navigate(endpoint.slug)"
          >
            <span class="ws-method mono">GET</span
            ><span class="mono">/{{ endpoint.slug }}</span
            ><UIcon :name="endpoint.icon" />
          </button>
        </nav>
        <div class="ws-request-bar">
          <div class="ws-request-field">
            <span class="ws-method mono"
              >GET <UIcon name="i-lucide-lock-keyhole" /></span
            ><code
              ><span>{{ requestHost }}</span
              >{{ requestUrl }}</code
            >
          </div>
          <button class="ws-send" :disabled="loading" @click="sendRequest">
            {{ loading ? "Sending" : "Send"
            }}<UIcon
              :name="
                loading ? 'i-lucide-loader-circle' : 'i-lucide-arrow-right'
              "
              :class="{ 'ws-spinning': loading }"
            />
          </button>
        </div>
        <div class="ws-response-bar">
          <div
            class="ws-response-tabs"
            role="tablist"
            aria-label="Response format"
            @keydown="onTabKey"
          >
            <button
              id="preview-tab"
              role="tab"
              :aria-selected="responseTab === 'preview'"
              :tabindex="responseTab === 'preview' ? 0 : -1"
              aria-controls="workspace-content"
              @click="responseTab = 'preview'"
            >
              <UIcon name="i-lucide-panels-top-left" />Preview</button
            ><button
              id="json-tab"
              role="tab"
              :aria-selected="responseTab === 'json'"
              :tabindex="responseTab === 'json' ? 0 : -1"
              aria-controls="workspace-content"
              @click="responseTab = 'json'"
            >
              <UIcon name="i-lucide-braces" />JSON</button
            ><button
              id="headers-tab"
              role="tab"
              :aria-selected="responseTab === 'headers'"
              :tabindex="responseTab === 'headers' ? 0 : -1"
              aria-controls="workspace-content"
              @click="responseTab = 'headers'"
            >
              Headers
            </button>
          </div>
          <div class="ws-response-meta mono" aria-live="polite">
            <template v-if="loading"><span>Request in progress</span></template
            ><template v-else-if="requestError"
              ><span>Request failed</span></template
            ><template v-else-if="status"
              ><span class="ws-status-ok"
                ><UIcon name="i-lucide-check" />{{ status }} OK</span
              ><span>{{ servedFromCache ? "Cached" : `${duration} ms` }}</span
              ><span>{{ (responseBytes / 1024).toFixed(1) }} KB</span></template
            ><span v-else class="ws-local-preview">Saved preview</span
            ><button
              class="ws-copy-json"
              aria-label="Copy response JSON"
              @click="copy(responseJson, 'Response')"
            >
              <UIcon name="i-lucide-copy" />
            </button>
          </div>
        </div>
        <div v-if="requestError" class="ws-error" role="alert">
          <UIcon name="i-lucide-circle-alert" />
          <p>{{ requestError }}</p>
          <button @click="sendRequest">Retry</button>
        </div>
        <div
          id="workspace-content"
          ref="contentPane"
          class="ws-content"
          role="tabpanel"
          :aria-labelledby="`${responseTab}-tab`"
          tabindex="0"
        >
          <div
            v-if="showSkeleton"
            class="ws-skeleton"
            role="status"
            aria-live="polite"
            aria-label="Loading portfolio content"
          >
            <span class="ws-skeleton-line ws-skeleton-kicker" />
            <span class="ws-skeleton-line ws-skeleton-title" />
            <span class="ws-skeleton-line ws-skeleton-copy" />
            <span class="ws-skeleton-line ws-skeleton-copy ws-skeleton-copy-short" />
            <div class="ws-skeleton-grid" aria-hidden="true">
              <span v-for="item in 3" :key="item" class="ws-skeleton-card" />
            </div>
            <span class="sr-only">Loading…</span>
          </div>
          <div v-else-if="responseTab === 'json'" class="ws-code-view">
            <div class="ws-code-heading">
              <div>
                <UIcon name="i-lucide-file-json" /><span
                  >{{ activeId }}.json</span
                >
              </div>
              <span>{{
                response !== null ? "Live API response" : "Saved portfolio data"
              }}</span>
            </div>
            <div class="ws-code-lines">
              <div
                v-for="(line, index) in responseJson.split('\n')"
                :key="index"
              >
                <span class="ws-line-number" aria-hidden="true">{{
                  index + 1
                }}</span
                ><code>{{ line }}</code>
              </div>
            </div>
          </div>
          <div v-else-if="responseTab === 'headers'" class="ws-headers-view">
            <div class="ws-view-heading">
              <span class="ws-kicker">RESPONSE METADATA</span>
              <h1>Under the hood.</h1>
              <p>Actual response headers from this Nuxt server.</p>
            </div>
            <table v-if="responseHeaders.length">
              <thead>
                <tr>
                  <th>Header</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="[name, value] in responseHeaders" :key="name">
                  <td>{{ name }}</td>
                  <td>{{ value }}</td>
                </tr>
              </tbody>
            </table>
            <div v-else class="ws-empty-state">
              <UIcon name="i-lucide-send" />
              <h2>No response headers yet.</h2>
              <p>Send a request to inspect the server's response.</p>
              <button
                class="ws-pink-button"
                :disabled="loading"
                @click="sendRequest"
              >
                {{ loading ? "Sending…" : "Send request"
                }}<UIcon name="i-lucide-arrow-right" />
              </button>
            </div>
          </div>
          <Transition
            v-else
            name="ws-view"
            mode="out-in"
            @after-enter="resetPreviewScroll"
          >
            <div :key="activeId" class="ws-preview">
              <template v-if="activeTemplate === 'introduction'">
                <div class="ws-preview-topline">
                  <span class="mono"
                    ><span class="ws-pink">const</span> developer =
                    <span class="ws-muted">a real person</span></span
                  ><span class="ws-preview-location"
                    ><UIcon name="i-lucide-map-pin" />{{ profile.location }}</span
                  >
                </div>
                <section class="ws-intro">
                  <div class="ws-intro-copy">
                    <p class="ws-kicker">{{ introductionHero.kicker }}</p>
                    <h1>
                      <span
                        v-for="line in introductionHeadingLines"
                        :key="line"
                        class="ws-intro-title-line"
                      >{{ line }}</span>
                    </h1>
                    <p class="ws-full-name">
                      {{ profile.name }} <span>/ {{ profile.role }}</span>
                    </p>
                    <p class="ws-intro-description">{{ introductionHero.description }}</p>
                    <div class="ws-intro-actions">
                      <button
                        class="ws-pink-button"
                        @click="navigateTemplate('project-list')"
                      >
                        {{ introductionHero.primaryAction }}
                        <UIcon name="i-lucide-arrow-up-right" /></button
                      ><button
                        class="ws-subtle-button"
                        @click="navigateTemplate('contact')"
                      >
                        {{ introductionHero.secondaryAction }}
                        <UIcon name="i-lucide-arrow-right" />
                      </button>
                    </div>
                  </div>
                  <WorkspacePortraitGraph />
                </section>
                <div class="ws-focus-strip">
                  <span class="mono ws-muted">{{ introductionFocus.heading }}</span>
                  <span v-for="item in introductionFocus.items" :key="item"
                    ><UIcon name="i-lucide-braces" />{{ item }}</span
                  >
                </div>
                <section class="ws-featured">
                  <div class="ws-section-title">
                    <div>
                      <h2>{{ introductionProjectsHeading.heading }}</h2>
                      <p>{{ introductionProjectsHeading.description }}</p>
                    </div>
                    <button @click="navigateTemplate('project-list')">
                      All projects <UIcon name="i-lucide-arrow-up-right" />
                    </button>
                  </div>
                  <div class="ws-projects-grid">
                    <WorkspaceProjectCard
                      v-for="project in projects"
                      :key="project.slug"
                      :project="project"
                      compact
                      @inspect="inspectProject"
                    />
                  </div>
                </section>
                <section class="ws-origin">
                  <div class="ws-origin-symbol">
                    <UIcon name="i-lucide-bot" />
                  </div>
                  <div>
                    <span class="ws-kicker">{{ introductionOrigin.kicker }}</span>
                    <h2>{{ introductionOrigin.heading }}</h2>
                    <p>{{ introductionOrigin.description }}</p>
                  </div>
                  <button
                    class="ws-subtle-button"
                    @click="navigateTemplate('experience-list')"
                  >
                    The journey <UIcon name="i-lucide-arrow-right" />
                  </button>
                </section>
                <div v-if="profile.education[0]" class="ws-education">
                  <UIcon name="i-lucide-graduation-cap" />
                  <p>
                    <strong>{{ profile.education[0].degree }}</strong
                    ><span>{{ profile.education[0].institution }}</span>
                  </p>
                  <span class="mono">{{ profile.education[0].period }}</span>
                </div>
              </template>
              <template v-else-if="activeTemplate === 'project-list'">
                <div class="ws-view-heading">
                  <span class="ws-kicker">{{ pageHeading.kicker }}</span>
                  <h1>{{ pageHeading.heading }}</h1>
                  <p>{{ pageHeading.description }}</p>
                </div>
                <div
                  class="ws-project-filters"
                  role="group"
                  aria-label="Filter projects"
                >
                  <button
                    v-for="filter in ['All projects', 'Fullstack', 'Backend']"
                    :key="filter"
                    :aria-pressed="projectFilter === filter"
                    @click="projectFilter = filter"
                  >
                    {{ filter }}</button
                  ><span class="mono"
                    >{{ displayedProjects.length }} projects</span
                  >
                </div>
                <div class="ws-project-gallery">
                  <WorkspaceProjectCard
                    v-for="project in displayedProjects"
                    :key="project.slug"
                    :project="project"
                    @inspect="inspectProject"
                  />
                </div>
                <section class="ws-archive">
                  <div class="ws-section-title">
                    <h2>{{ linkListContent.heading }}</h2>
                    <UIcon name="i-lucide-archive" />
                  </div>
                  <a
                    v-for="item in archive"
                    :key="item.name"
                    :href="item.repoUrl || item.liveUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    ><span class="mono">{{ item.period }}</span>
                    <div>
                      <strong>{{ item.name }}</strong>
                      <p>{{ item.summary }}</p>
                    </div>
                    <UIcon name="i-lucide-arrow-up-right"
                  /></a>
                </section>
              </template>
              <template v-else-if="activeTemplate === 'experience-list'">
                <div class="ws-view-heading">
                  <span class="ws-kicker">{{ pageHeading.kicker }}</span>
                  <h1>{{ pageHeading.heading }}</h1>
                  <p>{{ pageHeading.description }}</p>
                </div>
                <div class="ws-experience-workspace">
                  <div
                    class="ws-job-selector"
                    role="group"
                    aria-label="Select experience"
                  >
                    <button
                      v-for="(job, index) in experience"
                      :key="job.company"
                      :aria-pressed="selectedJob === index"
                      @click="selectedJob = index"
                    >
                      <span class="ws-job-marker"
                        ><UIcon
                          :name="
                            [
                              'i-lucide-plug-zap',
                              'i-lucide-graduation-cap',
                              'i-lucide-braces',
                            ][index]!
                          " /></span
                      ><span
                        ><small class="mono">{{ job.period }}</small
                        ><strong>{{ job.company }}</strong
                        ><span>{{ job.role }}</span></span
                      ><UIcon name="i-lucide-chevron-right" />
                    </button>
                  </div>
                  <section v-if="experience[selectedJob]" class="ws-job-detail">
                    <div class="ws-job-art" aria-hidden="true">
                      <UIcon
                        :name="
                          [
                            'i-lucide-plug-zap',
                            'i-lucide-graduation-cap',
                            'i-lucide-braces',
                          ][selectedJob]!
                        "
                      />
                      <div class="ws-job-art-line" />
                      <span>{{
                        [
                          "EV / CONNECTED SERVICES",
                          "SCHOOL / END-TO-END",
                          "APIS / INTELLIGENT RETRIEVAL",
                        ][selectedJob]
                      }}</span>
                    </div>
                    <span class="ws-kicker">{{
                      experience[selectedJob]!.period
                    }}</span>
                    <h2>{{ experience[selectedJob]!.fullCompany }}</h2>
                    <p class="ws-job-summary">
                      {{ experience[selectedJob]!.description }}
                    </p>
                    <ul>
                      <li
                        v-for="detail in experience[selectedJob]!.details"
                        :key="detail"
                      >
                        <UIcon name="i-lucide-arrow-up-right" /><span>{{
                          detail
                        }}</span>
                      </li>
                    </ul>
                    <div class="ws-tags">
                      <span
                        v-for="tag in experience[selectedJob]!.tags"
                        :key="tag"
                        >{{ tag }}</span
                      >
                    </div>
                  </section>
                </div>
                <a
                  v-if="profile.resume"
                  :href="profile.resume"
                  target="_blank"
                  rel="noopener"
                  class="ws-resume-row"
                  ><UIcon name="i-lucide-file-text" /><span
                    >{{ linkListContent.heading }}<strong
                      >{{ linkListContent.links[0]?.label }}</strong
                    ></span
                  ><UIcon name="i-lucide-arrow-up-right"
                /></a>
              </template>
              <template v-else-if="activeTemplate === 'skill-list'">
                <div class="ws-view-heading">
                  <span class="ws-kicker">{{ pageHeading.kicker }}</span>
                  <h1>{{ pageHeading.heading }}</h1>
                  <p>{{ pageHeading.description }}</p>
                </div>
                <div class="ws-stack-visual">
                  <div class="ws-stack-core">
                    <UIcon name="i-lucide-braces" /><strong>Go</strong
                    ><span class="mono">MY STARTING POINT</span>
                  </div>
                  <div class="ws-stack-flow">
                    <div>
                      <UIcon name="i-lucide-panels-top-left" /><span
                        >Interface</span
                      ><small>Vue / TypeScript</small>
                    </div>
                    <UIcon name="i-lucide-arrow-right" />
                    <div>
                      <UIcon name="i-lucide-network" /><span>Services</span
                      ><small>REST / gRPC</small>
                    </div>
                    <UIcon name="i-lucide-arrow-right" />
                    <div>
                      <UIcon name="i-lucide-database" /><span>Persistence</span
                      ><small>PostgreSQL / Redis</small>
                    </div>
                  </div>
                </div>
                <div
                  class="ws-stack-tabs"
                  role="group"
                  aria-label="Technology category"
                >
                  <button
                    v-for="(group, index) in skillGroups"
                    :key="group.label"
                    :aria-pressed="selectedStack === index"
                    @click="selectedStack = index"
                  >
                    <UIcon :name="group.icon" />{{ group.label }}
                  </button>
                </div>
                <section v-if="skillGroups[selectedStack]" class="ws-stack-items">
                  <div
                    v-for="item in skillGroups[selectedStack]!.items"
                    :key="item"
                  >
                    <UIcon name="i-lucide-check" /><span>{{ item }}</span>
                  </div>
                </section>
                <p class="ws-stack-footnote">
                  Tools I've used across backend, fullstack, and production
                  work.
                </p>
              </template>
              <template v-else-if="activeTemplate === 'contact'">
                <div class="ws-contact-preview">
                  <div class="ws-view-heading">
                    <span class="ws-kicker">{{ pageHeading.kicker }}</span>
                    <h1>{{ pageHeading.heading }}</h1>
                    <p>{{ pageHeading.description }}</p>
                  </div>
                  <div class="ws-contact-card">
                    <div class="ws-contact-postmark" aria-hidden="true">
                      <UIcon name="i-lucide-at-sign" />
                    </div>
                    <span class="mono">TO: {{ (profile.alias || profile.name).toUpperCase() }}</span
                    ><a :href="`mailto:${profile.email}`"
                      >{{ profile.email }}<UIcon name="i-lucide-arrow-up-right"
                    /></a>
                    <div class="ws-contact-card-bottom">
                      <span>{{ linkListContent.heading }}</span
                      ><button @click="copy(profile.email, 'Email')">
                        <UIcon name="i-lucide-copy" />Copy email
                      </button>
                    </div>
                  </div>
                  <div class="ws-contact-links">
                    <a
                      v-for="link in contactSocialLinks"
                      :key="link.url"
                      :href="link.url"
                      target="_blank"
                      rel="noopener noreferrer"
                      ><UIcon :name="linkIcon(link.url)" /><span
                        >{{ link.label }}<small>{{ link.description }}</small></span
                      ><UIcon name="i-lucide-arrow-up-right"
                    /></a>
                  </div>
                  <div class="ws-contact-signoff">
                    <img
                      v-if="profile.portrait"
                      :src="profile.portrait"
                      alt=""
                      width="48"
                      height="48"
                    />
                    <p>{{ contactSignoff }}</p>
                  </div>
                </div>
              </template>
              <template v-else>
                <PortfolioBlockRenderer
                  v-for="block in responseData?.blocks ?? []"
                  :key="block.id"
                  :block="block"
                  :content="responseData?.content ?? {}"
                  @inspect="inspectProject"
                />
              </template>
              <footer class="ws-preview-footer">
                <span>{{ site?.settings.footerText }}</span
                ><button
                  v-if="activeTemplate !== 'contact'"
                  @click="navigateTemplate('contact')"
                >
                  Have a conversation
                  <UIcon name="i-lucide-arrow-up-right" /></button
                ><button v-else @click="navigateTemplate('introduction')">
                  Back to introduction <UIcon name="i-lucide-arrow-up-left" />
                </button>
              </footer>
            </div>
          </Transition>
        </div>
      </main>
    </div>
    <footer class="ws-statusbar">
      <span><UIcon name="i-lucide-git-branch" />phuttinan / portfolio</span
      ><span class="ws-statusbar-message" role="status">{{
        copyNotice ||
        (loading
          ? "Making a real request…"
          : "Explore the person behind the endpoints.")
      }}</span
      ><span class="ws-statusbar-links"
        ><NuxtLink class="ws-admin-link" to="/admin/login"
          ><UIcon name="i-lucide-lock-keyhole" />Admin</NuxtLink
        ><span class="ws-statusbar-divider" aria-hidden="true">/</span
        ><span><UIcon name="i-lucide-code-xml" />Nuxt + TypeScript</span
        ><span class="ws-status-pink">♥</span></span
      >
    </footer>
    <div v-if="copyNotice" class="ws-copy-toast" role="status">
      {{ copyNotice }}
    </div>
    <dialog
      ref="dialog"
      class="ws-project-dialog"
      aria-labelledby="project-dialog-title"
      @click="$event.target === dialog && dialog?.close()"
      @close="selectedProject = null"
    >
      <div v-if="selectedProject" class="ws-dialog-inner">
        <button
          class="ws-dialog-close ws-icon"
          aria-label="Close project details"
          autofocus
          @click="dialog?.close()"
        >
          <UIcon name="i-lucide-x" />
        </button>
        <p class="ws-kicker">{{ selectedProject.category }}</p>
        <h2 id="project-dialog-title">{{ selectedProject.name }}</h2>
        <p class="ws-dialog-period mono">{{ selectedProject.period }}</p>
        <p class="ws-dialog-summary">{{ selectedProject.summary }}</p>
        <div class="ws-detail-flow">
          <span><UIcon name="i-lucide-panels-top-left" />Interface</span
          ><UIcon name="i-lucide-arrow-right" /><span
            ><UIcon name="i-lucide-braces" />Business logic</span
          ><UIcon name="i-lucide-arrow-right" /><span
            ><UIcon name="i-lucide-database" />Data</span
          >
        </div>
        <h3>What I worked on</h3>
        <ul>
          <li v-for="highlight in selectedProject.highlights" :key="highlight">
            {{ highlight }}
          </li>
        </ul>
        <div class="ws-tags">
          <span v-for="tech in selectedProject.stack" :key="tech">{{
            tech
          }}</span>
        </div>
        <div class="ws-dialog-links">
          <a
            v-if="selectedProject.liveUrl"
            :href="selectedProject.liveUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="ws-pink-button"
            >Visit website <UIcon name="i-lucide-arrow-up-right" /></a
          ><a
            v-if="selectedProject.repoUrl"
            :href="selectedProject.repoUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="ws-subtle-button"
            >Source code <UIcon name="i-lucide-github" /></a
          ><span v-else class="ws-muted">Private source code</span>
        </div>
      </div>
    </dialog>
  </div>
</template>

<style src="~/assets/css/workspace.css" />
