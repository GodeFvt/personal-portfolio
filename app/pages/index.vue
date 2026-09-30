<script setup lang="ts">
import {
  profile,
  projects,
  experience,
  skillGroups,
  archive,
} from "~~/shared/data/portfolio";
import {
  endpoints,
  isWorkspaceEndpoint,
  workspaceData,
  type WorkspaceEndpoint,
} from "~~/shared/data/workspace";

const route = useRoute();
const router = useRouter();
const activeId = computed<WorkspaceEndpoint>(() =>
  isWorkspaceEndpoint(route.query.endpoint) ? route.query.endpoint : "me",
);
const requestUrl = computed(() => `/api/portfolio/${activeId.value}`);
const requestHost = ref("");
const responseTab = ref<"preview" | "json" | "headers">("preview");
const search = ref("");
const searchInput = ref<HTMLInputElement>();
const sidebarOpen = ref(false);
const sidebarView = ref<"collections" | "history">("collections");
const contentPane = ref<HTMLElement>();
const requestTabs = ref<HTMLElement>();
const groupNames = ["The developer", "The work", "Say hello"];
const filteredEndpoints = computed(() =>
  endpoints.filter((endpoint) =>
    `${endpoint.id} ${endpoint.label} ${endpoint.description}`
      .toLowerCase()
      .includes(search.value.toLowerCase().trim()),
  ),
);
const loading = ref(false);
const response = shallowRef<unknown>(null);
const responseHeaders = ref<[string, string][]>([]);
const duration = ref<number | null>(null);
const status = ref<number | null>(null);
const requestError = ref("");
const history = ref<
  {
    id: number;
    endpoint: WorkspaceEndpoint;
    status: number | null;
    duration: number;
    time: string;
  }[]
>([]);
const responseJson = computed(() =>
  JSON.stringify(response.value ?? workspaceData[activeId.value], null, 2),
);
const responseBytes = computed(
  () => new TextEncoder().encode(responseJson.value).length,
);
let requestController: AbortController | undefined;
let requestSequence = 0;
let copiedTimer: ReturnType<typeof setTimeout> | undefined;
const copyNotice = ref("");
const dialog = ref<HTMLDialogElement>();
const selectedProject = ref<(typeof projects)[number] | null>(null);
const projectFilter = ref("All projects");
const displayedProjects = computed(() =>
  projects.filter(
    (project) =>
      projectFilter.value === "All projects" ||
      (projectFilter.value === "Backend"
        ? project.kind === "services"
        : project.kind !== "services"),
  ),
);
const selectedStack = ref(0);
const selectedJob = ref(0);

useSeoMeta({
  title: "Phuttinan Workspace | Backend & Fullstack Developer",
  description:
    "Meet Got. Explore real projects, backend systems, and the person behind the APIs in an interactive portfolio workspace.",
  ogTitle: "Phuttinan Workspace",
  ogDescription: "A little human. A lot of backend.",
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
async function navigate(id: WorkspaceEndpoint) {
  sidebarOpen.value = false;
  responseTab.value = "preview";
  await router.push({ path: "/", query: id === "me" ? {} : { endpoint: id } });
  resetPreviewScroll();
}
watch(activeId, () => {
  requestSequence++;
  requestController?.abort();
  loading.value = false;
  response.value = null;
  responseHeaders.value = [];
  duration.value = null;
  status.value = null;
  requestError.value = "";
  responseTab.value = "preview";
  nextTick(revealActiveTab);
});
async function sendRequest() {
  if (loading.value) return;
  const sequence = ++requestSequence;
  const endpoint = activeId.value;
  requestController?.abort();
  requestController = new AbortController();
  loading.value = true;
  requestError.value = "";
  status.value = null;
  duration.value = null;
  response.value = null;
  responseHeaders.value = [];
  const start = performance.now();
  try {
    const result = await $fetch.raw(requestUrl.value, {
      signal: requestController.signal,
      retry: 0,
    });
    if (sequence !== requestSequence) return;
    response.value = result._data;
    status.value = result.status;
    responseHeaders.value = [...result.headers.entries()];
  } catch (error) {
    if (sequence !== requestSequence) return;
    const fetchError = error as { statusCode?: number };
    status.value = fetchError.statusCode ?? null;
    requestError.value =
      "The request could not be completed. You can still explore the saved preview, or send it again.";
  } finally {
    if (sequence === requestSequence) {
      duration.value = Math.round(performance.now() - start);
      loading.value = false;
      history.value.unshift({
        id: sequence,
        endpoint,
        status: status.value,
        duration: duration.value,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
      history.value = history.value.slice(0, 12);
    }
  }
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
  selectedProject.value =
    projects.find((project) => project.slug === slug) ?? null;
  await nextTick();
  dialog.value?.showModal();
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
onMounted(() => {
  requestHost.value = window.location.host;
  revealActiveTab();
  window.addEventListener("keydown", onShortcut);
});
onBeforeUnmount(() => {
  requestController?.abort();
  clearTimeout(copiedTimer);
  window.removeEventListener("keydown", onShortcut);
});
</script>

<template>
  <div class="ws-app dark">
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
          ><strong>phuttinan<span>.workspace</span></strong></NuxtLink
        >
      </div>
      <div class="ws-top-context">
        <UIcon name="i-lucide-folder-open" /><span>Personal workspace</span
        ><UIcon name="i-lucide-chevron-right" /><span>Portfolio</span>
      </div>
      <div class="ws-top-actions">
        <a
          :href="profile.github"
          target="_blank"
          rel="noopener noreferrer"
          class="ws-icon"
          aria-label="View GitHub profile"
          ><UIcon name="i-lucide-github" /></a
        ><a
          href="/resume/phuttinan-resume.pdf"
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
          @click="navigate('me')"
        >
          <UIcon name="i-lucide-fingerprint" /></button
        ><button
          class="ws-rail-button"
          aria-label="Open contact"
          @click="navigate('contact')"
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
            /><span>phuttinan</span><span class="ws-count">5</span>
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
                  :class="{ active: activeId === endpoint.id }"
                  :aria-current="activeId === endpoint.id ? 'page' : undefined"
                  @click="navigate(endpoint.id)"
                >
                  <span class="ws-method mono">GET</span
                  ><span class="mono">/{{ endpoint.id }}</span
                  ><span
                    v-if="activeId === endpoint.id"
                    class="ws-active-dot"
                  />
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
            @click="navigate(entry.endpoint)"
          >
            <span><b class="ws-method mono">GET</b> /{{ entry.endpoint }}</span
            ><small
              >{{ entry.status ?? "Error" }} · {{ entry.duration }} ms
              <time>{{ entry.time }}</time></small
            ></button
          ><button
            v-if="history.length"
            class="ws-clear-history"
            @click="history = []"
          >
            Clear history
          </button>
        </div>
        <div class="ws-sidebar-bottom">
          <div class="ws-owner">
            <img src="/images/profile.jpg" alt="" width="32" height="32" />
            <div>
              <strong>Phuttinan Phaksaweng</strong
              ><span>Backend & Fullstack Developer</span>
            </div>
          </div>
          <p>A person. Some projects.<br />A few well-defined endpoints.</p>
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
            :class="{ active: activeId === endpoint.id }"
            :aria-current="activeId === endpoint.id ? 'page' : undefined"
            @click="navigate(endpoint.id)"
          >
            <span class="ws-method mono">GET</span
            ><span class="mono">/{{ endpoint.id }}</span
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
              ><span>{{ duration }} ms</span
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
          <div v-if="responseTab === 'json'" class="ws-code-view">
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
              <template v-if="activeId === 'me'">
                <div class="ws-preview-topline">
                  <span class="mono"
                    ><span class="ws-pink">const</span> developer =
                    <span class="ws-muted">a real person</span></span
                  ><span class="ws-preview-location"
                    ><UIcon name="i-lucide-map-pin" />Bangkok, Thailand</span
                  >
                </div>
                <section class="ws-intro">
                  <div class="ws-intro-copy">
                    <p class="ws-kicker">
                      HEY, I'M GOT <span class="ws-wave">↗</span>
                    </p>
                    <h1>A little human.<br />A lot of <span>backend.</span></h1>
                    <p class="ws-full-name">
                      Phuttinan Phaksaweng <span>/ Developer</span>
                    </p>
                    <p class="ws-intro-description">
                      I connect the things you see<br />with the systems you
                      don't.
                    </p>
                    <div class="ws-intro-actions">
                      <button
                        class="ws-pink-button"
                        @click="navigate('projects')"
                      >
                        Explore my work
                        <UIcon name="i-lucide-arrow-up-right" /></button
                      ><button
                        class="ws-subtle-button"
                        @click="navigate('contact')"
                      >
                        Let's talk <UIcon name="i-lucide-arrow-right" />
                      </button>
                    </div>
                  </div>
                  <WorkspacePortraitGraph />
                </section>
                <div class="ws-focus-strip">
                  <span class="mono ws-muted">MY KIND OF WORK</span
                  ><span><UIcon name="i-lucide-braces" />Backend systems</span
                  ><span><UIcon name="i-lucide-network" />Connected APIs</span
                  ><span
                    ><UIcon name="i-lucide-container" />Real-world
                    delivery</span
                  >
                </div>
                <section class="ws-featured">
                  <div class="ws-section-title">
                    <div>
                      <h2>Less talk. More shipped.</h2>
                      <p>A few things I've helped bring to life.</p>
                    </div>
                    <button @click="navigate('projects')">
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
                    <span class="ws-kicker">BEFORE THE APIS</span>
                    <h2>It started with a robot.</h2>
                    <p>
                      LEGO robotics, competitions, and a curiosity about how
                      things work. That same curiosity now goes into every
                      system I build.
                    </p>
                  </div>
                  <button
                    class="ws-subtle-button"
                    @click="navigate('experience')"
                  >
                    The journey <UIcon name="i-lucide-arrow-right" />
                  </button>
                </section>
                <div class="ws-education">
                  <UIcon name="i-lucide-graduation-cap" />
                  <p>
                    <strong>B.Sc. Information Technology</strong
                    ><span
                      >King Mongkut's University of Technology Thonburi</span
                    >
                  </p>
                  <span class="mono">2022 - 2026</span>
                </div>
              </template>
              <template v-else-if="activeId === 'projects'">
                <div class="ws-view-heading">
                  <span class="ws-kicker">SELECTED WORK</span>
                  <h1>Ideas, with an <span>implementation.</span></h1>
                  <p>
                    School platforms, connected services, and the infrastructure
                    underneath.
                  </p>
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
                    <h2>The earlier experiments</h2>
                    <UIcon name="i-lucide-archive" />
                  </div>
                  <a
                    v-for="item in archive"
                    :key="item.name"
                    :href="item.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    ><span class="mono">{{ item.year }}</span>
                    <div>
                      <strong>{{ item.name }}</strong>
                      <p>{{ item.description }}</p>
                    </div>
                    <UIcon name="i-lucide-arrow-up-right"
                  /></a>
                </section>
              </template>
              <template v-else-if="activeId === 'experience'">
                <div class="ws-view-heading">
                  <span class="ws-kicker">EXPERIENCE</span>
                  <h1>
                    Different teams.<br />The same <span>curiosity.</span>
                  </h1>
                  <p>
                    From an internship to freelance delivery and EV charging
                    systems.
                  </p>
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
                  href="/resume/phuttinan-resume.pdf"
                  target="_blank"
                  rel="noopener"
                  class="ws-resume-row"
                  ><UIcon name="i-lucide-file-text" /><span
                    >Want the full picture?<strong
                      >Take a look at my résumé.</strong
                    ></span
                  ><UIcon name="i-lucide-arrow-up-right"
                /></a>
              </template>
              <template v-else-if="activeId === 'stack'">
                <div class="ws-view-heading">
                  <span class="ws-kicker">TECH STACK</span>
                  <h1>
                    Backend at heart.<br /><span>Fullstack by practice.</span>
                  </h1>
                  <p>
                    The tools I use to take an idea from architecture to
                    deployment.
                  </p>
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
                <section class="ws-stack-items">
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
              <template v-else-if="activeId === 'contact'">
                <div class="ws-contact-preview">
                  <div class="ws-view-heading">
                    <span class="ws-kicker">LET'S CONNECT</span>
                    <h1>Good things start<br />with a <span>hello.</span></h1>
                    <p>
                      A role, a project, or a particularly interesting backend
                      problem.<br />I'd be happy to hear about it.
                    </p>
                  </div>
                  <div class="ws-contact-card">
                    <div class="ws-contact-postmark" aria-hidden="true">
                      <UIcon name="i-lucide-at-sign" />
                    </div>
                    <span class="mono">TO: PHUTTINAN</span
                    ><a :href="`mailto:${profile.email}`"
                      >{{ profile.email }}<UIcon name="i-lucide-arrow-up-right"
                    /></a>
                    <div class="ws-contact-card-bottom">
                      <span>Best place to reach me.</span
                      ><button @click="copy(profile.email, 'Email')">
                        <UIcon name="i-lucide-copy" />Copy email
                      </button>
                    </div>
                  </div>
                  <div class="ws-contact-links">
                    <a
                      :href="profile.github"
                      target="_blank"
                      rel="noopener noreferrer"
                      ><UIcon name="i-lucide-github" /><span
                        >GitHub<small>Code & experiments</small></span
                      ><UIcon name="i-lucide-arrow-up-right" /></a
                    ><a
                      :href="profile.linkedin"
                      target="_blank"
                      rel="noopener noreferrer"
                      ><UIcon name="i-lucide-linkedin" /><span
                        >LinkedIn<small>The professional side</small></span
                      ><UIcon name="i-lucide-arrow-up-right" /></a
                    ><a href="/resume/phuttinan-resume.pdf" download
                      ><UIcon name="i-lucide-file-down" /><span
                        >Résumé<small>Download the full story</small></span
                      ><UIcon name="i-lucide-arrow-down"
                    /></a>
                  </div>
                  <div class="ws-contact-signoff">
                    <img
                      src="/images/profile.jpg"
                      alt=""
                      width="48"
                      height="48"
                    />
                    <p>
                      Thanks for exploring my little corner of the internet.<br /><strong
                        >Got.</strong
                      >
                    </p>
                  </div>
                </div>
              </template>
              <footer class="ws-preview-footer">
                <span>Built with intent. And Nuxt.</span
                ><button
                  v-if="activeId !== 'contact'"
                  @click="navigate('contact')"
                >
                  Have a conversation
                  <UIcon name="i-lucide-arrow-up-right" /></button
                ><button v-else @click="navigate('me')">
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
      ><span
        ><UIcon name="i-lucide-code-xml" />Nuxt + TypeScript
        <span class="ws-status-pink">♥</span></span
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
