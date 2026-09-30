<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "admin" });
useSeoMeta({ title: "Admin overview | Phuttinan Workspace", robots: "noindex, nofollow" });

interface SummaryGroup { publicationState: string; _count: number }
interface SummaryResponse {
  data: {
    tabs: SummaryGroup[];
    projects: SummaryGroup[];
    experiences: SummaryGroup[];
    users: number;
    recentAudit: { id: string; action: string; entityType: string; createdAt: string }[];
  };
}

const { data, error, refresh } = await useLazyFetch<SummaryResponse>("/api/admin/summary", {
  key: "admin-summary",
});

function total(items: SummaryGroup[] | undefined) {
  return items?.reduce((sum, item) => sum + item._count, 0) ?? 0;
}

function published(items: SummaryGroup[] | undefined) {
  return items?.find((item) => item.publicationState === "PUBLISHED")?._count ?? 0;
}
</script>

<template>
  <div class="admin-page">
    <header class="admin-page-header">
      <div>
        <p class="admin-eyebrow">Portfolio control plane</p>
        <h1>Overview</h1>
        <p>Published content, drafts, and recent security activity.</p>
      </div>
      <NuxtLink class="admin-secondary-button" to="/" target="_blank">View site <UIcon name="i-lucide-external-link" /></NuxtLink>
    </header>

    <AdminSkeleton v-if="!data && !error" variant="overview" :rows="3" />
    <div v-else-if="error && !data" class="admin-empty-state">
      <strong>Overview is unavailable.</strong>
      <button type="button" @click="() => refresh()">Try again</button>
    </div>
    <template v-else>
      <section class="admin-metrics" aria-label="Content totals">
        <div><span>Navigation tabs</span><strong>{{ total(data?.data.tabs) }}</strong><small>{{ published(data?.data.tabs) }} published</small></div>
        <div><span>Projects</span><strong>{{ total(data?.data.projects) }}</strong><small>{{ published(data?.data.projects) }} published</small></div>
        <div><span>Experience</span><strong>{{ total(data?.data.experiences) }}</strong><small>{{ published(data?.data.experiences) }} published</small></div>
        <div><span>Administrators</span><strong>{{ data?.data.users ?? 0 }}</strong><small>invite only</small></div>
      </section>

      <section class="admin-section">
        <div class="admin-section-heading"><div><p class="admin-eyebrow">Audit trail</p><h2>Recent activity</h2></div><NuxtLink to="/admin/security/audit">View all</NuxtLink></div>
        <div class="admin-activity-list">
          <div v-for="entry in data?.data.recentAudit" :key="entry.id" class="admin-activity-row">
            <span class="admin-status-dot" />
            <div><strong>{{ entry.action }}</strong><span>{{ entry.entityType }}</span></div>
            <time :datetime="entry.createdAt">{{ new Date(entry.createdAt).toLocaleString() }}</time>
          </div>
          <p v-if="!data?.data.recentAudit.length" class="admin-muted">No activity has been recorded yet.</p>
        </div>
      </section>
    </template>
  </div>
</template>
