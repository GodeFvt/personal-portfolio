<script setup lang="ts">
withDefaults(defineProps<{
  variant?: "overview" | "editor" | "list";
  rows?: number;
}>(), {
  variant: "list",
  rows: 4,
});
</script>

<template>
  <div class="admin-skeleton" :class="`admin-skeleton--${variant}`" role="status" aria-live="polite" aria-busy="true">
    <template v-if="variant === 'overview'">
      <div class="admin-skeleton-metrics">
        <div v-for="index in 4" :key="index"><i /><b /><small /></div>
      </div>
      <div class="admin-skeleton-section-title"><i /><b /></div>
    </template>

    <div v-if="variant === 'editor'" class="admin-skeleton-editor">
      <div v-for="index in 2" :key="index"><b /><i /><i /><span /></div>
    </div>

    <div class="admin-skeleton-rows">
      <div v-for="index in rows" :key="index" class="admin-skeleton-row">
        <i /><span><b /><small /></span><em />
      </div>
    </div>
    <span class="admin-sr-only">Loading content</span>
  </div>
</template>
