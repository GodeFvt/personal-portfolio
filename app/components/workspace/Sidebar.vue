<script setup lang="ts">
import type { PortfolioWorkspaceView } from "~/types/portfolio";

defineProps<
  Pick<
    PortfolioWorkspaceView,
    | "site"
    | "profile"
    | "endpoints"
    | "groupNames"
    | "filteredEndpoints"
    | "activeId"
    | "navigate"
    | "history"
    | "openHistory"
    | "historyTime"
    | "clearHistory"
    | "setSearchInput"
  >
>();
const sidebarOpen = defineModel<PortfolioWorkspaceView["sidebarOpen"]>(
  "sidebarOpen",
  { required: true },
);
const sidebarView = defineModel<PortfolioWorkspaceView["sidebarView"]>(
  "sidebarView",
  { required: true },
);
const search = defineModel<PortfolioWorkspaceView["search"]>("search", {
  required: true,
});
</script>

<template>
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
          :ref="setSearchInput"
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
            </button>
          </div></template
        >
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
          Press Send to make a real request. Your session history will appear
          here.
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
        @click="clearHistory()"
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
</template>
