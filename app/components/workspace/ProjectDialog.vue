<script setup lang="ts">
import type { PortfolioWorkspaceView } from "~/types/portfolio";

defineProps<Pick<PortfolioWorkspaceView, "dialog" | "setDialog">>();
const selectedProject = defineModel<PortfolioWorkspaceView["selectedProject"]>(
  "selectedProject",
  { required: true },
);
</script>

<template>
  <dialog
    :ref="setDialog"
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
</template>
