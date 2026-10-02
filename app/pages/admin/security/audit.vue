<script setup lang="ts">
import { createSecurityAuditApi } from "~/lib/api/admin/security/audit";
import type { AuditResponse } from "~/types/admin/security/audit";

const api = createSecurityAuditApi(useNuxtApp().$api);

definePageMeta({ layout: "admin", middleware: "admin" });
useSeoMeta({
  title: "Security audit | Portfolio admin",
  robots: "noindex, nofollow",
});

const { data, error, refresh } = await useApiData<AuditResponse>(
  api.pathAudit,
  {
    lazy: true,
    query: { perPage: 50 },
  },
);
</script>
<template>
  <div class="admin-page">
    <header class="admin-page-header">
      <div>
        <p class="admin-eyebrow">Security record</p>
        <h1>Audit</h1>
        <p>Authentication, access, publication, and configuration events.</p>
      </div>
    </header>
    <AdminSkeleton v-if="!data && !error" :rows="6" />
    <div v-else-if="error && !data" class="admin-empty-state">
      <strong>Audit events could not be loaded.</strong
      ><button @click="() => refresh()">Try again</button>
    </div>
    <section v-else class="admin-section">
      <div class="admin-activity-list">
        <div
          v-for="entry in data?.data.items"
          :key="entry.id"
          class="admin-activity-row"
        >
          <span class="admin-status-dot" />
          <div>
            <strong>{{ entry.action }}</strong
            ><span
              >{{ entry.actor?.email ?? "System operator" }} ·
              {{ entry.entityType }}</span
            >
          </div>
          <time :datetime="entry.createdAt">{{
            new Date(entry.createdAt).toLocaleString()
          }}</time>
        </div>
        <p v-if="!data?.data.items.length" class="admin-muted">
          No audit events yet.
        </p>
      </div>
    </section>
  </div>
</template>
