<script setup lang="ts">
import type {
  ApiEnvelope,
  PortfolioApiData,
  SiteApiData,
} from "~~/shared/types/portfolio-api";
import { createPortfolioApi } from "~/lib/api/portfolio";

const portfolioApi = createPortfolioApi(useNuxtApp().$api);
const { data: siteResponse, error: siteError } = await useApiData<
  ApiEnvelope<SiteApiData>
>(portfolioApi.paths.site, { key: "public-site" });
const navigation = usePortfolioNavigation(siteResponse);
const { data: initialTabResponse } = await useApiData<
  ApiEnvelope<PortfolioApiData>
>(navigation.requestUrl.value, {
  key: `initial-tab-${navigation.activeId.value}`,
});
const { sidebar, request, preview, projectDialog, clipboard } =
  usePortfolioWorkspace(navigation, initialTabResponse);
</script>

<template>
  <div class="ws-app">
    <a class="ws-skip" href="#workspace-content">Skip to preview</a>
    <WorkspaceHeader
      v-bind="sidebar.header"
      v-model:sidebarOpen="sidebar.sidebarOpen"
    />
    <div class="ws-layout">
      <button
        v-if="sidebar.sidebarOpen"
        class="ws-sidebar-scrim"
        aria-label="Close collections"
        @click="sidebar.sidebarOpen = false"
      />
      <nav class="ws-rail" aria-label="Workspace tools">
        <button
          class="ws-rail-button"
          :class="{ active: sidebar.sidebarView === 'collections' }"
          aria-label="Collections"
          @click="sidebar.sidebarView = 'collections'"
        >
          <UIcon name="i-lucide-folders" /></button
        ><button
          class="ws-rail-button"
          :class="{ active: sidebar.sidebarView === 'history' }"
          aria-label="Request history"
          @click="sidebar.sidebarView = 'history'"
        >
          <UIcon name="i-lucide-history" /></button
        ><span class="ws-rail-separator" /><button
          class="ws-rail-button"
          aria-label="Open introduction"
          @click="sidebar.navigateTemplate('introduction')"
        >
          <UIcon name="i-lucide-fingerprint" /></button
        ><button
          class="ws-rail-button"
          aria-label="Open contact"
          @click="sidebar.navigateTemplate('contact')"
        >
          <UIcon name="i-lucide-at-sign" />
        </button>
      </nav>
      <WorkspaceSidebar
        v-bind="sidebar.props"
        v-model:sidebarOpen="sidebar.sidebarOpen"
        v-model:sidebarView="sidebar.sidebarView"
        v-model:search="sidebar.search"
      />
      <main class="ws-main">
        <WorkspaceRequestControls
          v-bind="request.controls"
          v-model:responseTab="request.responseTab"
        />
        <WorkspacePreview
          v-bind="preview"
          v-model:projectFilter="request.projectFilter"
        />
      </main>
    </div>
    <footer class="ws-statusbar">
      <span><UIcon name="i-lucide-git-branch" />phuttinan / portfolio</span
      ><span class="ws-statusbar-message" role="status">{{
        clipboard.notice ||
        (request.loading
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
    <div v-if="clipboard.notice" class="ws-copy-toast" role="status">
      {{ clipboard.notice }}
    </div>
    <WorkspaceProjectDialog
      v-bind="projectDialog.props"
      v-model:selectedProject="projectDialog.selectedProject"
    />
  </div>
</template>

<style src="~/assets/css/workspace.css" />
