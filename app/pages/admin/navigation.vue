<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "admin" });
useSeoMeta({ title: "Navigation | Portfolio admin", robots: "noindex, nofollow" });

interface Revision {
  id: string;
  entityType: "NavigationGroup" | "PortfolioTab";
  entityId: string;
  version: number;
  createdAt: string;
}
interface NavigationResponse {
  data: {
    groups: Array<{
      id: string;
      label: string;
      sortOrder: number;
      visibility: "VISIBLE" | "HIDDEN" | "ARCHIVED";
      version: number;
      tabs: Array<{
        id: string;
        slug: string;
        label: string;
        description: string;
        icon: string;
        template: string;
        publicationState: string;
        sortOrder: number;
        version: number;
      }>;
    }>;
    revisions: Revision[];
  };
}

const { adminSession } = useAdminSession();
const { data, error, refresh } = await useLazyFetch<NavigationResponse>("/api/admin/navigation", { key: "admin-navigation" });
const saving = ref(false);
const notice = ref("");
const formError = ref("");
const groupEditId = ref<string>();
const groupExpectedVersion = ref(0);
const groupLabel = ref("");
const groupVisibility = ref<"VISIBLE" | "HIDDEN" | "ARCHIVED">("VISIBLE");
const tabGroupId = ref("");
const tabSlug = ref("");
const tabLabel = ref("");
const tabDescription = ref("");
const tabIcon = ref("i-lucide-file-text");
const tabContent = ref("");

const canWrite = computed(() => adminSession.value?.user.permissions.includes("navigation.write"));
const canPublish = computed(() => adminSession.value?.user.permissions.includes("content.publish"));
const nextGroupOrder = computed(() => Math.max(-1, ...(data.value?.data.groups.map((group) => group.sortOrder) ?? [])) + 1);
const nextTabOrder = computed(() => {
  const group = data.value?.data.groups.find((item) => item.id === tabGroupId.value);
  return Math.max(-1, ...(group?.tabs.map((tab) => tab.sortOrder) ?? [])) + 1;
});

watchEffect(() => {
  if (!tabGroupId.value && data.value?.data.groups[0]) tabGroupId.value = data.value.data.groups[0].id;
});

function apiMessage(error: unknown) {
  return (error as { data?: { error?: { message?: string } } }).data?.error?.message ?? "The request could not be completed.";
}

function editGroup(group: NavigationResponse["data"]["groups"][number]) {
  groupEditId.value = group.id;
  groupExpectedVersion.value = group.version;
  groupLabel.value = group.label;
  groupVisibility.value = group.visibility;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetGroupForm() {
  groupEditId.value = undefined;
  groupExpectedVersion.value = 0;
  groupLabel.value = "";
  groupVisibility.value = "VISIBLE";
}

async function saveGroupDraft() {
  if (!adminSession.value || saving.value) return;
  saving.value = true;
  notice.value = "";
  formError.value = "";
  try {
    await $fetch("/api/admin/navigation/drafts", {
      method: "POST",
      headers: { "x-csrf-token": adminSession.value.csrfToken },
      body: {
        entityType: "NavigationGroup",
        entityId: groupEditId.value,
        expectedVersion: groupExpectedVersion.value,
        snapshot: {
          label: groupLabel.value,
          sortOrder: groupEditId.value
            ? data.value?.data.groups.find((group) => group.id === groupEditId.value)?.sortOrder ?? 0
            : nextGroupOrder.value,
          visibility: groupVisibility.value,
        },
      },
    });
    notice.value = "Group draft saved. Publish it when ready.";
    resetGroupForm();
    await refresh();
  } catch (error) {
    formError.value = apiMessage(error);
  } finally {
    saving.value = false;
  }
}

async function saveTabDraft() {
  if (!adminSession.value || saving.value) return;
  saving.value = true;
  notice.value = "";
  formError.value = "";
  try {
    await $fetch("/api/admin/navigation/drafts", {
      method: "POST",
      headers: { "x-csrf-token": adminSession.value.csrfToken },
      body: {
        entityType: "PortfolioTab",
        expectedVersion: 0,
        snapshot: {
          groupId: tabGroupId.value,
          slug: tabSlug.value,
          label: tabLabel.value,
          description: tabDescription.value,
          icon: tabIcon.value,
          template: "CUSTOM_PAGE",
          sortOrder: nextTabOrder.value,
          publicationState: "PUBLISHED",
          blocks: tabContent.value.trim()
            ? [{ type: "TEXT", props: { type: "text", content: tabContent.value.trim() } }]
            : [],
        },
      },
    });
    notice.value = "Custom tab draft saved. It is still hidden from the public site.";
    tabSlug.value = "";
    tabLabel.value = "";
    tabDescription.value = "";
    tabContent.value = "";
    await refresh();
  } catch (error) {
    formError.value = apiMessage(error);
  } finally {
    saving.value = false;
  }
}

async function publish(revision: Revision) {
  if (!adminSession.value || saving.value) return;
  saving.value = true;
  notice.value = "";
  formError.value = "";
  try {
    await $fetch("/api/admin/publish", {
      method: "POST",
      headers: { "x-csrf-token": adminSession.value.csrfToken },
      body: { revisions: [{ entityType: revision.entityType, entityId: revision.entityId, version: revision.version }] },
    });
    notice.value = "Published successfully. The public API now uses this version.";
    await refresh();
  } catch (error) {
    formError.value = apiMessage(error);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="admin-page">
    <header class="admin-page-header">
      <div><p class="admin-eyebrow">Content structure</p><h1>Navigation</h1><p>Groups and tabs remain private until their draft revision is published.</p></div>
      <span class="admin-environment">{{ data?.data.revisions.length ?? 0 }} drafts</span>
    </header>

    <p v-if="notice" class="admin-notice" role="status">{{ notice }}</p>
    <p v-if="formError" class="admin-form-error admin-page-error" role="alert">{{ formError }}</p>

    <AdminSkeleton v-if="!data && !error" variant="editor" :rows="3" />
    <div v-else-if="error && !data" class="admin-empty-state"><strong>Navigation could not be loaded.</strong><button type="button" @click="() => refresh()">Try again</button></div>
    <template v-else>
      <section v-if="canWrite" class="admin-editor-grid">
        <form class="admin-editor-pane" @submit.prevent="saveGroupDraft">
          <div class="admin-section-heading"><div><p class="admin-eyebrow">Group draft</p><h2>{{ groupEditId ? 'Edit group' : 'New group' }}</h2></div><button v-if="groupEditId" type="button" class="admin-text-button" @click="resetGroupForm">Cancel</button></div>
          <label class="admin-field"><span>Label</span><input v-model="groupLabel" required maxlength="120" /></label>
          <label class="admin-field"><span>Published visibility</span><select v-model="groupVisibility"><option value="VISIBLE">Visible</option><option value="HIDDEN">Hidden</option><option value="ARCHIVED">Archived</option></select></label>
          <button class="admin-primary-button" type="submit" :disabled="saving">Save draft</button>
        </form>

        <form class="admin-editor-pane" @submit.prevent="saveTabDraft">
          <div class="admin-section-heading"><div><p class="admin-eyebrow">Custom page</p><h2>New tab</h2></div></div>
          <label class="admin-field"><span>Group</span><select v-model="tabGroupId" required><option v-for="group in data?.data.groups" :key="group.id" :value="group.id">{{ group.label }}</option></select></label>
          <div class="admin-field-row"><label class="admin-field"><span>Label</span><input v-model="tabLabel" required maxlength="120" /></label><label class="admin-field"><span>Slug</span><input v-model="tabSlug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="open-source" /></label></div>
          <label class="admin-field"><span>Description</span><input v-model="tabDescription" maxlength="500" /></label>
          <label class="admin-field"><span>Text block</span><textarea v-model="tabContent" rows="4" maxlength="10000" /></label>
          <button class="admin-primary-button" type="submit" :disabled="saving || !tabGroupId">Save private draft</button>
        </form>
      </section>

      <section v-if="data?.data.revisions.length" class="admin-section">
        <div class="admin-section-heading"><div><p class="admin-eyebrow">Review queue</p><h2>Unpublished revisions</h2></div></div>
        <div class="admin-activity-list">
          <div v-for="revision in data.data.revisions" :key="revision.id" class="admin-activity-row admin-draft-row">
            <span class="admin-status-dot" /><div><strong>{{ revision.entityType }}</strong><span>Version {{ revision.version }} · {{ revision.entityId }}</span></div>
            <button v-if="canPublish" class="admin-secondary-button" type="button" :disabled="saving" @click="publish(revision)">Publish</button>
            <span v-else class="admin-muted">Owner approval required</span>
          </div>
        </div>
      </section>

      <section class="admin-section">
        <div class="admin-section-heading"><div><p class="admin-eyebrow">Current records</p><h2>Groups and tabs</h2></div></div>
        <div class="admin-group-list">
          <article v-for="group in data?.data.groups" :key="group.id" class="admin-group-row">
            <div class="admin-group-heading"><div><strong>{{ group.label }}</strong><span>{{ group.visibility }} · version {{ group.version }}</span></div><button v-if="canWrite" class="admin-text-button" type="button" @click="editGroup(group)">Edit draft</button></div>
            <div class="admin-tab-list"><div v-for="tab in group.tabs" :key="tab.id"><code>/{{ tab.slug }}</code><span>{{ tab.label }}</span><small>{{ tab.publicationState }}</small></div><p v-if="!group.tabs.length" class="admin-muted">No tabs in this group.</p></div>
          </article>
        </div>
      </section>
    </template>
  </div>
</template>
