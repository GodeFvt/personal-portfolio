<script setup lang="ts">
import type {
  MediaUploadProvider,
  MediaUploadProviderOption,
} from "~/types/admin/upload";
import { createMediaApi } from "~/lib/api/admin/media";
import type { MediaItem, MediaResponse } from "~/types/admin/MediaPicker";

const api = createMediaApi(useNuxtApp().$api);

const props = withDefaults(
  defineProps<{
    modelValue?: string | null;
    kind?: "image" | "pdf";
    label?: string;
    canUpload?: boolean;
  }>(),
  { modelValue: null, kind: "image", label: "Media", canUpload: true },
);
const emit = defineEmits<{
  "update:modelValue": [value: string | null];
  selected: [item: MediaItem];
}>();
const { adminSession } = useAdminSession();
const { data, refresh } = await useApiData<MediaResponse>(
  api.pickerPath(props.kind),
  { lazy: true, key: `media-picker-${props.kind}` },
);
const fileInput = ref<HTMLInputElement>();
const alt = ref("");
const provider = ref<MediaUploadProvider>("vercel-blob");
const uploading = ref(false);
const uploadError = ref("");
const selected = computed(() =>
  data.value?.data.items.find((item) => item.id === props.modelValue),
);
const { data: providerData } = await useApiData<{
  data: { providers: MediaUploadProviderOption[] };
}>(api.pathProviders, { lazy: true, key: "media-upload-providers" });
const uploadProviders = computed(
  () => providerData.value?.data.providers ?? [],
);
watchEffect(() => {
  if (
    !uploadProviders.value.some(
      (item) => item.key === provider.value && item.enabled,
    )
  ) {
    const first = uploadProviders.value.find((item) => item.enabled);
    if (first) provider.value = first.key;
  }
});

function choose(item: MediaItem) {
  emit("update:modelValue", item.id);
  emit("selected", item);
}

async function uploadSelected() {
  const file = fileInput.value?.files?.[0];
  if (!file || !alt.value.trim() || !adminSession.value) return;
  uploading.value = true;
  uploadError.value = "";
  try {
    const result = await uploadAdminMedia(
      file,
      alt.value.trim(),
      adminSession.value.csrfToken,
      provider.value,
    );
    await refresh();
    const item = data.value?.data.items.find(
      (entry) => entry.id === result.data.id,
    );
    if (item) choose(item);
    alt.value = "";
    if (fileInput.value) fileInput.value.value = "";
  } catch (error) {
    uploadError.value =
      error instanceof Error
        ? error.message
        : "The file could not be uploaded.";
  } finally {
    uploading.value = false;
  }
}
</script>

<template>
  <div class="admin-media-picker">
    <div class="admin-media-picker-head">
      <span>{{ label }}</span>
      <button
        v-if="modelValue"
        class="admin-text-button"
        type="button"
        @click="emit('update:modelValue', null)"
      >
        Clear
      </button>
    </div>
    <div v-if="selected" class="admin-media-selected">
      <img
        v-if="selected.mimeType.startsWith('image/') && selected.contentUrl"
        :src="selected.contentUrl"
        :alt="selected.alt"
      />
      <UIcon v-else name="i-lucide-file-text" />
      <div>
        <strong>{{ selected.originalName }}</strong
        ><small>{{ selected.alt }}</small>
      </div>
    </div>
    <div class="admin-media-options">
      <button
        v-for="item in data?.data.items"
        :key="item.id"
        type="button"
        :class="{ 'is-selected': item.id === modelValue }"
        @click="choose(item)"
      >
        <img
          v-if="item.mimeType.startsWith('image/') && item.contentUrl"
          :src="item.contentUrl"
          :alt="item.alt"
          loading="lazy"
        />
        <UIcon v-else name="i-lucide-file-text" />
        <span>{{ item.originalName }}</span>
      </button>
      <span v-if="!data?.data.items.length" class="admin-muted"
        >No verified {{ kind }} files yet.</span
      >
    </div>
    <details
      v-if="canUpload && adminSession?.user.permissions.includes('media.write')"
      class="admin-media-quick-upload"
    >
      <summary>
        {{ modelValue ? "Upload replacement" : "Upload new file" }}
      </summary>
      <label class="admin-field"
        ><span>File</span
        ><input
          ref="fileInput"
          type="file"
          :accept="
            kind === 'image'
              ? 'image/jpeg,image/png,image/webp'
              : 'application/pdf'
          "
      /></label>
      <label class="admin-field"
        ><span>Alternative text</span><input v-model="alt" maxlength="300"
      /></label>
      <label class="admin-field"
        ><span>Store in</span
        ><select v-model="provider">
          <option
            v-for="option in uploadProviders"
            :key="option.key"
            :value="option.key"
            :disabled="!option.enabled"
          >
            {{ option.label }}{{ option.enabled ? "" : " — not configured" }}
          </option>
        </select></label
      >
      <p v-if="uploadError" class="admin-form-error" role="alert">
        {{ uploadError }}
      </p>
      <button
        class="admin-secondary-button"
        type="button"
        :disabled="
          uploading ||
          !alt.trim() ||
          !uploadProviders.some((item) => item.key === provider && item.enabled)
        "
        @click="uploadSelected"
      >
        {{ uploading ? "Verifying…" : "Upload and select" }}
      </button>
    </details>
  </div>
</template>
