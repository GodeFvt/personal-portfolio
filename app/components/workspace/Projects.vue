<script setup lang="ts">
import type { PortfolioWorkspaceView } from "~/types/portfolio";

defineProps<
  Pick<
    PortfolioWorkspaceView,
    | "pageHeading"
    | "displayedProjects"
    | "linkListContent"
    | "archive"
    | "inspectProject"
  >
>();
const projectFilter = defineModel<PortfolioWorkspaceView["projectFilter"]>(
  "projectFilter",
  { required: true },
);
</script>

<template>
  <div class="ws-view-heading">
    <span class="ws-kicker">{{ pageHeading.kicker }}</span>
    <h1>{{ pageHeading.heading }}</h1>
    <p>{{ pageHeading.description }}</p>
  </div>
  <div class="ws-project-filters" role="group" aria-label="Filter projects">
    <button
      v-for="filter in ['All projects', 'Fullstack', 'Backend']"
      :key="filter"
      :aria-pressed="projectFilter === filter"
      @click="projectFilter = filter"
    >
      {{ filter }}</button
    ><span class="mono">{{ displayedProjects.length }} projects</span>
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
