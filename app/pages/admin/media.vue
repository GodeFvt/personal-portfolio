<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "admin" });
useSeoMeta({ title: "Media | Portfolio admin", robots: "noindex, nofollow" });

interface References { profiles: unknown[]; projects: unknown[]; blocks: unknown[]; drafts: unknown[] }
interface MediaItem {
  id: string; originalName: string; mimeType: string; size: string; width: number | null; height: number | null;
  alt: string; provider: string; visibility: "PRIVATE" | "PUBLIC"; status: string; version: number;
  createdAt: string; contentUrl: string | null; publicUrl: string | null; references: References;
}
interface MediaResponse { data: { items: MediaItem[] } }

const { adminSession } = useAdminSession();
const requestConfirmation = useAdminConfirm();
const { data, error, refresh } = await useLazyFetch<MediaResponse>("/api/admin/media", { key: "admin-media" });
const fileInput = ref<HTMLInputElement>();
const alt = ref("");
const busy = ref(false);
const notice = ref("");
const formError = ref("");
const linkLifetime = reactive<Record<string, number>>({});
const privateLinks = reactive<Record<string, { url: string; expiresAt: string }>>({});
const canWrite = computed(() => adminSession.value?.user.permissions.includes("media.write"));

function apiMessage(error: unknown) { return (error as { data?: { error?: { message?: string } } }).data?.error?.message ?? (error instanceof Error ? error.message : "The request could not be completed."); }
function referenceCount(item: MediaItem) { return Object.values(item.references).reduce((total, entries) => total + entries.length, 0); }
function formatSize(size: string) { const bytes = Number(size); return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }
function lifetime(item: MediaItem) { return linkLifetime[item.id] ?? 3600; }
function expiresLabel(value: string) { return new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }); }

async function copyLink(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    notice.value = "Link copied to clipboard.";
    formError.value = "";
  } catch {
    formError.value = "The link could not be copied. Select the URL and copy it manually.";
  }
}

async function createPrivateLink(item: MediaItem) {
  if (!adminSession.value) return;
  busy.value = true; notice.value = ""; formError.value = "";
  try {
    const result = await $fetch<{ data: { url: string; expiresAt: string } }>(`/api/admin/media/${item.id}/signed-link`, {
      method: "POST",
      headers: { "x-csrf-token": adminSession.value.csrfToken },
      body: { lifetimeSeconds: lifetime(item) },
    });
    privateLinks[item.id] = result.data;
    notice.value = "Expiring private link created.";
  } catch (error) { formError.value = apiMessage(error); }
  finally { busy.value = false; }
}

async function uploadFile() {
  const file = fileInput.value?.files?.[0];
  if (!file || !alt.value.trim() || !adminSession.value) return;
  busy.value = true; notice.value = ""; formError.value = "";
  try {
    await uploadAdminMedia(file, alt.value.trim(), adminSession.value.csrfToken);
    notice.value = "Upload verified and added to the private media library.";
    alt.value = ""; if (fileInput.value) fileInput.value.value = "";
    await refresh();
  } catch (error) { formError.value = apiMessage(error); }
  finally { busy.value = false; }
}

async function save(item: MediaItem) {
  if (!adminSession.value) return;
  busy.value = true; notice.value = ""; formError.value = "";
  try {
    await $fetch(`/api/admin/media/${item.id}`, { method: "PATCH", headers: { "x-csrf-token": adminSession.value.csrfToken }, body: { alt: item.alt, visibility: item.visibility, expectedVersion: item.version } });
    notice.value = "Media details updated."; await refresh();
  } catch (error) { formError.value = apiMessage(error); }
  finally { busy.value = false; }
}

async function remove(item: MediaItem) {
  if (!adminSession.value || !await requestConfirmation({ title: `Delete ${item.originalName}?`, description: "This file will be removed permanently and cannot be recovered.", confirmLabel: "Delete media", tone: "danger" })) return;
  busy.value = true; notice.value = ""; formError.value = "";
  try {
    await $fetch(`/api/admin/media/${item.id}`, { method: "DELETE", headers: { "x-csrf-token": adminSession.value.csrfToken } });
    notice.value = "Media file deleted."; await refresh();
  } catch (error) { formError.value = apiMessage(error); }
  finally { busy.value = false; }
}

async function cleanup() {
  if (!adminSession.value) return;
  busy.value = true; notice.value = ""; formError.value = "";
  try {
    const result = await $fetch<{ data: { scanned: number; deleted: number } }>("/api/admin/media/cleanup", { method: "POST", headers: { "x-csrf-token": adminSession.value.csrfToken } });
    notice.value = `Cleanup checked ${result.data.scanned} items and removed ${result.data.deleted}.`; await refresh();
  } catch (error) { formError.value = apiMessage(error); }
  finally { busy.value = false; }
}
</script>

<template>
  <div class="admin-page">
    <header class="admin-page-header"><div><p class="admin-eyebrow">Asset library</p><h1>Media</h1><p>Public assets have permanent shareable URLs. Private assets use signed links that expire automatically.</p></div><button v-if="canWrite" class="admin-secondary-button" type="button" :disabled="busy" @click="cleanup">Clean orphan files</button></header>
    <p v-if="notice" class="admin-notice" role="status">{{ notice }}</p><p v-if="formError" class="admin-form-error admin-page-error" role="alert">{{ formError }}</p>
    <section v-if="canWrite" class="admin-section admin-media-upload-panel">
      <div class="admin-section-heading"><div><p class="admin-eyebrow">New asset</p><h2>Upload and verify</h2></div><span class="admin-muted">JPEG, PNG, WebP ≤ 5 MB · PDF ≤ 10 MB</span></div>
      <div class="admin-field-row"><label class="admin-field"><span>File</span><input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" /></label><label class="admin-field"><span>Alternative text</span><input v-model="alt" maxlength="300" placeholder="Describe the image or document" /></label></div>
      <button class="admin-primary-button" type="button" :disabled="busy || !alt.trim()" @click="uploadFile">{{ busy ? 'Uploading and verifying…' : 'Upload private asset' }}</button>
    </section>
    <AdminSkeleton v-if="!data && !error" variant="list" :rows="5" />
    <div v-else-if="error && !data" class="admin-empty-state"><strong>Media could not be loaded.</strong><button type="button" @click="() => refresh()">Try again</button></div>
    <section v-else class="admin-media-library">
      <article v-for="item in data?.data.items" :key="item.id" class="admin-media-card">
        <a class="admin-media-preview" :href="item.contentUrl || undefined" target="_blank">
          <img v-if="item.mimeType.startsWith('image/') && item.contentUrl" :src="item.contentUrl" :alt="item.alt" loading="lazy" />
          <UIcon v-else name="i-lucide-file-text" />
        </a>
        <div class="admin-media-card-body">
          <div class="admin-media-meta"><div><strong>{{ item.originalName }}</strong><span>{{ item.mimeType }} · {{ formatSize(item.size) }}<template v-if="item.width"> · {{ item.width }}×{{ item.height }}</template></span></div><span class="admin-state-label">{{ item.status }}</span></div>
          <label class="admin-field"><span>Alternative text</span><input v-model="item.alt" :disabled="!canWrite" maxlength="300" /></label>
          <div class="admin-field-row"><label class="admin-field"><span>Visibility</span><select v-model="item.visibility" :disabled="!canWrite"><option>PRIVATE</option><option>PUBLIC</option></select></label><div class="admin-media-reference"><span>References</span><strong>{{ referenceCount(item) }}</strong><small>{{ item.references.drafts.length }} private drafts</small></div></div>
          <div v-if="item.visibility === 'PUBLIC' && item.publicUrl" class="admin-media-link-panel">
            <span>Permanent public URL</span>
            <div class="admin-copy-field"><input :value="item.publicUrl" readonly /><button type="button" class="admin-secondary-button" @click="copyLink(item.publicUrl)">Copy</button></div>
          </div>
          <div v-else-if="item.visibility === 'PRIVATE' && canWrite" class="admin-media-link-panel">
            <span>Expiring private URL</span>
            <div class="admin-media-link-controls"><select :value="lifetime(item)" @change="linkLifetime[item.id] = Number(($event.target as HTMLSelectElement).value)"><option :value="900">15 minutes</option><option :value="3600">1 hour</option><option :value="86400">24 hours</option><option :value="604800">7 days</option></select><button type="button" class="admin-secondary-button" :disabled="busy" @click="createPrivateLink(item)">Create link</button></div>
            <div v-if="privateLinks[item.id]" class="admin-copy-field"><input :value="privateLinks[item.id]!.url" readonly /><button type="button" class="admin-secondary-button" @click="copyLink(privateLinks[item.id]!.url)">Copy</button></div>
            <small v-if="privateLinks[item.id]">Expires {{ expiresLabel(privateLinks[item.id]!.expiresAt) }}</small>
          </div>
          <div v-if="canWrite" class="admin-form-actions"><button class="admin-text-button" type="button" :disabled="busy || referenceCount(item) > 0" @click="remove(item)">Delete</button><button class="admin-secondary-button" type="button" :disabled="busy" @click="save(item)">Save details</button></div>
        </div>
      </article>
      <div v-if="!data?.data.items.length" class="admin-empty-state"><strong>No media uploaded yet.</strong></div>
    </section>
  </div>
</template>
