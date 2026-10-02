<script setup lang="ts">
import type { PortfolioWorkspaceView } from "~/types/portfolio";

defineProps<
  Pick<PortfolioWorkspaceView, "site" | "profile" | "activeEndpoint">
>();
const sidebarOpen = defineModel<PortfolioWorkspaceView["sidebarOpen"]>(
  "sidebarOpen",
  { required: true },
);
</script>

<template>
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
      <UIcon name="i-lucide-folder-open" /><span>{{
        site?.settings.siteName
      }}</span
      ><UIcon name="i-lucide-chevron-right" /><span>{{
        activeEndpoint?.label
      }}</span>
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
</template>
