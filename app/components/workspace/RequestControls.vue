<script setup lang="ts">
import type { PortfolioWorkspaceView } from "~/types/portfolio";

defineProps<
  Pick<
    PortfolioWorkspaceView,
    | "endpoints"
    | "activeId"
    | "navigate"
    | "requestHost"
    | "requestUrl"
    | "loading"
    | "sendRequest"
    | "onTabKey"
    | "requestError"
    | "status"
    | "servedFromCache"
    | "duration"
    | "responseBytes"
    | "copy"
    | "responseJson"
    | "setRequestTabs"
  >
>();
const responseTab = defineModel<PortfolioWorkspaceView["responseTab"]>(
  "responseTab",
  { required: true },
);
</script>

<template>
  <nav
    :ref="setRequestTabs"
    class="ws-request-tabs"
    aria-label="Open endpoints"
  >
    <button
      v-for="endpoint in endpoints"
      :key="endpoint.id"
      :class="{ active: activeId === endpoint.slug }"
      :aria-current="activeId === endpoint.slug ? 'page' : undefined"
      @click="navigate(endpoint.slug)"
    >
      <span class="ws-method mono">GET</span
      ><span class="mono">/{{ endpoint.slug }}</span
      ><UIcon :name="endpoint.icon" />
    </button>
  </nav>
  <div class="ws-request-bar">
    <div class="ws-request-field">
      <span class="ws-method mono"
        >GET <UIcon name="i-lucide-lock-keyhole" /></span
      ><code
        ><span>{{ requestHost }}</span
        >{{ requestUrl }}</code
      >
    </div>
    <button class="ws-send" :disabled="loading" @click="sendRequest">
      {{ loading ? "Sending" : "Send"
      }}<UIcon
        :name="loading ? 'i-lucide-loader-circle' : 'i-lucide-arrow-right'"
        :class="{ 'ws-spinning': loading }"
      />
    </button>
  </div>
  <div class="ws-response-bar">
    <div
      class="ws-response-tabs"
      role="tablist"
      aria-label="Response format"
      @keydown="onTabKey"
    >
      <button
        id="preview-tab"
        role="tab"
        :aria-selected="responseTab === 'preview'"
        :tabindex="responseTab === 'preview' ? 0 : -1"
        aria-controls="workspace-content"
        @click="responseTab = 'preview'"
      >
        <UIcon name="i-lucide-panels-top-left" />Preview</button
      ><button
        id="json-tab"
        role="tab"
        :aria-selected="responseTab === 'json'"
        :tabindex="responseTab === 'json' ? 0 : -1"
        aria-controls="workspace-content"
        @click="responseTab = 'json'"
      >
        <UIcon name="i-lucide-braces" />JSON</button
      ><button
        id="headers-tab"
        role="tab"
        :aria-selected="responseTab === 'headers'"
        :tabindex="responseTab === 'headers' ? 0 : -1"
        aria-controls="workspace-content"
        @click="responseTab = 'headers'"
      >
        Headers
      </button>
    </div>
    <div class="ws-response-meta mono" aria-live="polite">
      <template v-if="loading"><span>Request in progress</span></template
      ><template v-else-if="requestError"><span>Request failed</span></template
      ><template v-else-if="status"
        ><span class="ws-status-ok"
          ><UIcon name="i-lucide-check" />{{ status }} OK</span
        ><span>{{ servedFromCache ? "Cached" : `${duration} ms` }}</span
        ><span>{{ (responseBytes / 1024).toFixed(1) }} KB</span></template
      ><span v-else class="ws-local-preview">Saved preview</span
      ><button
        class="ws-copy-json"
        aria-label="Copy response JSON"
        @click="copy(responseJson, 'Response')"
      >
        <UIcon name="i-lucide-copy" />
      </button>
    </div>
  </div>
  <div v-if="requestError" class="ws-error" role="alert">
    <UIcon name="i-lucide-circle-alert" />
    <p>{{ requestError }}</p>
    <button @click="sendRequest">Retry</button>
  </div>
</template>
