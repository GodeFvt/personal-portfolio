<script setup lang="ts">
import type { PortfolioWorkspaceView } from "~/types/portfolio";

defineProps<Pick<PortfolioWorkspaceView, "pageHeading" | "skillGroups">>();
const selectedStack = defineModel<PortfolioWorkspaceView["selectedStack"]>(
  "selectedStack",
  { required: true },
);
</script>

<template>
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
        <UIcon name="i-lucide-panels-top-left" /><span>Interface</span
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
  <div class="ws-stack-tabs" role="group" aria-label="Technology category">
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
    <div v-for="item in skillGroups[selectedStack]!.items" :key="item">
      <UIcon name="i-lucide-check" /><span>{{ item }}</span>
    </div>
  </section>
  <p class="ws-stack-footnote">
    Tools I've used across backend, fullstack, and production work.
  </p>
</template>
