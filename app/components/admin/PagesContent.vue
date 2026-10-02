<script setup lang="ts">
import { ZodError } from "zod";
import { portfolioTabSnapshotSchema } from "~~/shared/schemas/admin-content";
import { createPagesApi } from "~/lib/api/admin/pages";
import { createPublicationApi } from "~/lib/api/admin/publication";
import { apiMessage } from "~/lib/api/client";
import {
  pageBlockEditor,
  serializePageBlock,
  type PageBlockEditor,
} from "~/lib/page-blocks";
import type {
  ContentPage,
  PagesResponse,
  PageSnapshot,
} from "~/types/admin/pages";
const api = createPagesApi(useNuxtApp().$api);
const publicationApi = createPublicationApi(useNuxtApp().$api);
const route = useRoute();
const { adminSession } = useAdminSession();
const { data, error, refresh } = await useApiData<PagesResponse>(
  api.pathPages,
  { key: "admin-pages", lazy: true },
);
const selectedId = ref("");
const expectedVersion = ref(0);
const template = ref<PageSnapshot["template"]>("CUSTOM_PAGE");
const blocks = ref<PageBlockEditor[]>([]);
const savedForm = ref("");
const unsavedChanges = computed(
  () =>
    savedForm.value !==
    JSON.stringify({ template: template.value, blocks: blocks.value }),
);
const saving = ref(false);
const notice = ref("");
const formError = ref("");
const canWrite = computed(() =>
  adminSession.value?.user.permissions.includes("content.write"),
);
const canPublish = computed(() =>
  adminSession.value?.user.permissions.includes("content.publish"),
);
const selected = computed(() =>
  data.value?.data.pages.find((page) => page.id === selectedId.value),
);
const revision = computed(() =>
  data.value?.data.revisions.find(
    (item) =>
      item.entityId === selectedId.value &&
      item.version === expectedVersion.value + 1,
  ),
);
const templateSource = computed(() =>
  data.value?.data.pages.find(
    (page) =>
      page.id !== selectedId.value &&
      page.template === template.value &&
      page.blocks.length,
  ),
);
function copyTemplate() {
  if (!templateSource.value) return;
  blocks.value = templateSource.value.blocks.map((block) =>
    pageBlockEditor(block.type, { ...block.props }),
  );
}
function selectPage(page: ContentPage) {
  selectedId.value = page.id;
  expectedVersion.value = page.version;
  const draft = data.value?.data.revisions.find(
    (item) => item.entityId === page.id && item.version === page.version + 1,
  );
  const snapshot = draft
    ? portfolioTabSnapshotSchema.parse(draft.snapshot)
    : page;
  template.value = snapshot.template;
  blocks.value = snapshot.blocks.map((block) =>
    pageBlockEditor(block.type, block.props),
  );
  savedForm.value = JSON.stringify({
    template: template.value,
    blocks: blocks.value,
  });
  formError.value = "";
}
watch(
  data,
  () => {
    const id =
      selectedId.value ||
      (typeof route.query.page === "string" ? route.query.page : "");
    const page =
      data.value?.data.pages.find((item) => item.id === id) ??
      data.value?.data.pages[0];
    if (page) selectPage(page);
  },
  { immediate: true },
);
watch(
  () => route.query.page,
  (id) => {
    const page = data.value?.data.pages.find((item) => item.id === id);
    if (page) selectPage(page);
  },
);
async function save() {
  if (!selected.value || saving.value) return;
  saving.value = true;
  notice.value = "";
  formError.value = "";
  try {
    await api.saveDraft(selectedId.value, {
      data: {
        expectedVersion: expectedVersion.value,
        template: template.value,
        blocks: blocks.value.map(serializePageBlock),
      },
    });
    await refresh();
    notice.value = "Page draft saved. Publish when ready.";
  } catch (error) {
    formError.value =
      error instanceof ZodError
        ? `Check page content: ${error.issues[0]?.message ?? "Invalid block fields."}`
        : apiMessage(error, "Check the block fields and link destinations.");
  } finally {
    saving.value = false;
  }
}
async function publish() {
  if (!revision.value || saving.value || unsavedChanges.value) return;
  saving.value = true;
  notice.value = "";
  formError.value = "";
  try {
    await publicationApi.publish({
      data: {
        revisions: [
          {
            entityType: "PortfolioTab",
            entityId: selectedId.value,
            version: revision.value.version,
          },
        ],
      },
    });
    await refresh();
    notice.value =
      "Page published. The public portfolio now uses this content.";
  } catch (error) {
    formError.value = apiMessage(error);
  } finally {
    saving.value = false;
  }
}
</script>
<template>
  <section class="admin-section">
    <div class="admin-section-heading">
      <div>
        <p class="admin-eyebrow">Every portfolio tab</p>
        <h2>Pages</h2>
        <p class="admin-muted">
          Edit content here. Manage tab names, groups, visibility, and deletion
          in Navigation.
        </p>
      </div>
      <NuxtLink to="/admin/navigation" class="admin-text-button"
        >Manage navigation</NuxtLink
      >
    </div>
    <p v-if="notice" class="admin-notice" role="status">{{ notice }}</p>
    <p v-if="formError" class="admin-form-error" role="alert">
      {{ formError }}
    </p>
    <AdminSkeleton v-if="!data && !error" variant="editor" :rows="3" />
    <div v-else-if="error && !data" class="admin-empty-state">
      <strong>Pages could not be loaded.</strong
      ><button type="button" @click="() => refresh()">Try again</button>
    </div>
    <template v-else>
      <nav class="admin-content-tabs" aria-label="Portfolio pages">
        <button
          v-for="page in data?.data.pages"
          :key="page.id"
          type="button"
          :class="{ 'is-active': selectedId === page.id }"
          @click="selectPage(page)"
        >
          <strong>{{ page.label }}</strong
          ><span
            >/{{ page.slug }} · {{ page.publicationState
            }}{{
              data?.data.revisions.some((item) => item.entityId === page.id)
                ? " · draft"
                : ""
            }}</span
          >
        </button>
      </nav>
      <form
        v-if="selected && canWrite"
        class="admin-editor-pane"
        @submit.prevent="save"
      >
        <div class="admin-section-heading">
          <div>
            <p class="admin-eyebrow">
              {{ revision ? "Private draft" : "Current content" }}
            </p>
            <h2>{{ selected.label }}</h2>
          </div>
          <NuxtLink
            :to="`/api/admin/preview/${selected.id}`"
            target="_blank"
            class="admin-text-button"
            >Preview data</NuxtLink
          >
        </div>
        <label class="admin-field"
          ><span>Page layout</span
          ><select v-model="template">
            <option value="INTRODUCTION">Introduction</option>
            <option value="PROJECT_LIST">Projects</option>
            <option value="EXPERIENCE_LIST">Experience</option>
            <option value="SKILL_LIST">Stack</option>
            <option value="CONTACT">Contact</option>
            <option value="CUSTOM_PAGE">Custom — all blocks in order</option>
          </select></label
        >
        <p class="admin-muted">
          Built-in layouts use their matching heading, hero, focus, list, and
          signoff blocks. Choose Custom to freely combine and reorder all
          blocks. Profile, project, experience, and technology records are
          shared with the main Content sections.
        </p>
        <button
          v-if="templateSource && !blocks.length"
          type="button"
          class="admin-secondary-button"
          @click="copyTemplate"
        >
          Start with {{ templateSource.label }} content
        </button>
        <AdminPageBlockEditor v-model="blocks" />
        <div class="admin-toggle-row">
          <button class="admin-primary-button" type="submit" :disabled="saving">
            Save private draft</button
          ><button
            v-if="revision && canPublish"
            class="admin-secondary-button"
            type="button"
            :disabled="saving || unsavedChanges"
            @click="publish"
          >
            Publish saved draft
          </button>
        </div>
        <p v-if="revision" class="admin-muted">
          Publish applies the saved draft, including any saved navigation
          changes. Save your current edits first.
        </p>
      </form>
      <p v-else-if="selected" class="admin-muted">
        You can view pages but need content editing permission to change them.
      </p>
      <p v-else class="admin-muted">
        Create a tab in Navigation to start editing its content here.
      </p>
    </template>
  </section>
</template>
