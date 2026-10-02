<script setup lang="ts">
import type { ProviderDraftPayload } from "~~/shared/types/admin-api";
import { createSecurityLoginMethodsApi } from "~/lib/api/admin/security/login-methods";
import { createAuthApi } from "~/lib/api/auth";
import { apiMessage } from "~/lib/api/client";
import type {
  Provider,
  Identity,
  SecurityProvidersResponse,
} from "~/types/admin/security/login-methods";

const api = createSecurityLoginMethodsApi(useNuxtApp().$api);
const authApi = createAuthApi(useNuxtApp().$api);

definePageMeta({ layout: "admin", middleware: "admin" });
useSeoMeta({
  title: "Login methods | Portfolio admin",
  robots: "noindex, nofollow",
});

const { adminSession, clear } = useAdminSession();
const requestConfirmation = useAdminConfirm();
const { data, error, refresh } = await useApiData<SecurityProvidersResponse>(
  api.pathProviders,
  {
    lazy: true,
  },
);
const route = useRoute();
const editing = ref<Provider | null>(null);
const label = ref("");
const clientId = ref("");
const clientSecret = ref("");
const sortOrder = ref(0);
const tenant = ref("");
const accountPolicy = ref<"single-tenant" | "organizations" | "common">(
  "single-tenant",
);
const emailRequired = ref(true);
const busy = ref(false);
const message = ref("");
const errorMessage = ref("");
const canManage = computed(
  () =>
    adminSession.value?.user.permissions.includes("auth.providers.manage") ??
    false,
);

onMounted(() => {
  const result = typeof route.query.oauth === "string" ? route.query.oauth : "";
  const messages: Record<string, string> = {
    tested: "Live provider test passed.",
    linked: "Identity linked.",
    reauthenticated: "Authentication refreshed.",
    cancelled: "OAuth flow was cancelled.",
    failed: "OAuth flow failed validation.",
  };
  if (messages[result]) message.value = messages[result];
});

function beginEdit(provider: Provider) {
  editing.value = provider;
  label.value = provider.label;
  clientId.value = provider.latestConfig?.clientId ?? "";
  clientSecret.value = "";
  sortOrder.value = provider.sortOrder;
  tenant.value = provider.latestConfig?.options.tenant ?? "common";
  accountPolicy.value =
    provider.latestConfig?.options.accountPolicy ?? "common";
  emailRequired.value = provider.latestConfig?.options.emailRequired ?? true;
  errorMessage.value = "";
}
function providerOptions(provider: Provider): ProviderDraftPayload["options"] {
  if (provider.type === "microsoft")
    return {
      type: "microsoft",
      tenant: tenant.value,
      accountPolicy: accountPolicy.value,
    };
  if (provider.type === "github")
    return { type: "github", emailRequired: emailRequired.value };
  return { type: "google" };
}
async function saveDraft() {
  if (!editing.value || busy.value) return;
  busy.value = true;
  errorMessage.value = "";
  message.value = "";
  try {
    await api.saveProviderDraft(editing.value.id, {
      data: {
        expectedVersion: editing.value.version,
        label: label.value,
        clientId: clientId.value,
        ...(clientSecret.value ? { clientSecret: clientSecret.value } : {}),
        sortOrder: sortOrder.value,
        options: providerOptions(editing.value),
      },
    });
    message.value =
      "Provider draft saved. Complete a live test before activation.";
    editing.value = null;
    await refresh();
  } catch (error) {
    errorMessage.value = apiMessage(
      error,
      "Provider draft could not be saved.",
    );
  } finally {
    busy.value = false;
  }
}
async function startOAuth(
  provider: Provider,
  intent: "TEST" | "LINK" | "REAUTH",
) {
  busy.value = true;
  errorMessage.value = "";
  try {
    const response = await authApi.startOAuth(provider.key, {
      data: { intent },
    });
    window.location.assign(response.data.authorizationUrl);
  } catch (error) {
    errorMessage.value = apiMessage(error, "OAuth flow could not be started.");
    busy.value = false;
  }
}
async function activate(provider: Provider) {
  if (!provider.latestConfig || busy.value) return;
  busy.value = true;
  errorMessage.value = "";
  try {
    await api.activate(provider.id, {
      data: {
        expectedVersion: provider.version,
        configVersion: provider.latestConfig.configVersion,
      },
    });
    message.value = `${provider.label} activated.`;
    await refresh();
  } catch (error) {
    errorMessage.value = apiMessage(error, "Provider could not be activated.");
  } finally {
    busy.value = false;
  }
}
async function disable(provider: Provider) {
  if (
    busy.value ||
    !(await requestConfirmation({
      title: `Disable ${provider.label}?`,
      description:
        "This login method will be disabled and all sessions created through it will be revoked.",
      confirmLabel: "Disable and revoke",
      tone: "danger",
    }))
  )
    return;
  busy.value = true;
  errorMessage.value = "";
  try {
    await api.disable(provider.id, {
      data: { expectedVersion: provider.version },
    });
    message.value = `${provider.label} disabled and sessions revoked.`;
    await refresh();
  } catch (error) {
    errorMessage.value = apiMessage(error, "Provider could not be disabled.");
  } finally {
    busy.value = false;
  }
}
async function unlink(identity: Identity) {
  if (
    busy.value ||
    !(await requestConfirmation({
      title: `Unlink ${identity.provider.label}?`,
      description:
        "You may be signed out if this identity is connected to your current session.",
      confirmLabel: "Unlink identity",
      tone: "danger",
    }))
  )
    return;
  busy.value = true;
  errorMessage.value = "";
  try {
    const response = await api.unlinkIdentity(identity.id, {});
    if (response.data.loggedOut) {
      clear();
      await navigateTo("/admin/login");
      return;
    }
    message.value = "Identity unlinked.";
    await refresh();
  } catch (error) {
    errorMessage.value = apiMessage(error, "Identity could not be unlinked.");
  } finally {
    busy.value = false;
  }
}
function linked(provider: Provider) {
  return data.value?.data.currentIdentities.find(
    (identity) => identity.provider.id === provider.id,
  );
}
</script>

<template>
  <div class="admin-page">
    <header class="admin-page-header">
      <div>
        <p class="admin-eyebrow">Authentication</p>
        <h1>Login methods</h1>
        <p>
          Save credentials as a draft, complete a real provider round-trip, then
          activate the tested version.
        </p>
      </div>
    </header>
    <p v-if="message" class="admin-notice" role="status">{{ message }}</p>
    <p
      v-if="errorMessage"
      class="admin-form-error admin-page-error"
      role="alert"
    >
      {{ errorMessage }}
    </p>
    <section v-if="editing" class="admin-editor-grid">
      <div class="admin-editor-pane">
        <p class="admin-eyebrow">Provider draft</p>
        <h2>{{ editing.type }}</h2>
        <p class="admin-muted">
          Callback URL:
          <code
            >{{ data?.data.callbackBaseUrl }}/{{ editing.key }}/callback</code
          >
        </p>
      </div>
      <form class="admin-editor-pane" @submit.prevent="saveDraft">
        <label class="admin-field"
          ><span>Button label</span
          ><input v-model="label" required maxlength="120"
        /></label>
        <label class="admin-field"
          ><span>Client ID</span
          ><input
            v-model="clientId"
            required
            maxlength="500"
            autocomplete="off"
        /></label>
        <label class="admin-field"
          ><span
            >Client secret
            {{
              editing.latestConfig?.secretConfigured
                ? "(leave blank to keep current)"
                : ""
            }}</span
          ><input
            v-model="clientSecret"
            type="password"
            :required="!editing.latestConfig?.secretConfigured"
            maxlength="2000"
            autocomplete="new-password"
        /></label>
        <label class="admin-field"
          ><span>Sort order</span
          ><input
            v-model.number="sortOrder"
            type="number"
            min="0"
            max="100"
            required
        /></label>
        <template v-if="editing.type === 'microsoft'"
          ><label class="admin-field"
            ><span>Tenant ID or domain</span
            ><input v-model="tenant" required maxlength="120" /></label
          ><label class="admin-field"
            ><span>Account policy</span
            ><select v-model="accountPolicy">
              <option value="single-tenant">Single tenant</option>
              <option value="organizations">Organizations</option>
              <option value="common">Common</option>
            </select></label
          ></template
        >
        <label v-if="editing.type === 'github'" class="admin-check-line"
          ><input v-model="emailRequired" type="checkbox" /> Require a verified
          primary email</label
        >
        <div class="admin-form-actions">
          <button
            class="admin-secondary-button"
            type="button"
            @click="editing = null"
          >
            Cancel</button
          ><button class="admin-primary-button" type="submit" :disabled="busy">
            {{ busy ? "Saving..." : "Save draft" }}
          </button>
        </div>
      </form>
    </section>
    <AdminSkeleton v-if="!data && !error" :rows="4" />
    <div v-else-if="error && !data" class="admin-empty-state">
      <strong>Login methods could not be loaded.</strong
      ><button @click="() => refresh()">Try again</button>
    </div>
    <section v-else class="admin-section">
      <div class="admin-provider-list">
        <article class="admin-provider-row">
          <div>
            <strong>Password login</strong
            ><span>Operator bootstrap and invited administrators</span>
          </div>
          <b class="admin-state-label">ENABLED</b>
        </article>
        <article
          v-for="provider in data?.data.providers"
          :key="provider.id"
          class="admin-provider-row admin-provider-manage"
        >
          <div>
            <strong>{{ provider.label }}</strong
            ><span>{{ provider.type }} · {{ provider.key }}</span
            ><small>{{
              provider.latestConfig?.testedAt
                ? `Tested ${new Date(provider.latestConfig.testedAt).toLocaleString()}`
                : provider.latestConfig
                  ? "Draft not tested"
                  : "Not configured"
            }}</small>
          </div>
          <div class="admin-provider-actions">
            <b class="admin-state-label">{{
              provider.enabled ? "ENABLED" : "DISABLED"
            }}</b
            ><button
              v-if="canManage"
              class="admin-text-button"
              type="button"
              @click="beginEdit(provider)"
            >
              Configure</button
            ><button
              v-if="canManage && provider.latestConfig"
              class="admin-text-button"
              type="button"
              @click="startOAuth(provider, 'TEST')"
            >
              Test</button
            ><button
              v-if="
                canManage &&
                provider.latestConfig?.testedAt &&
                provider.activeConfigVersion !==
                  provider.latestConfig.configVersion
              "
              class="admin-text-button"
              type="button"
              @click="activate(provider)"
            >
              Activate</button
            ><button
              v-if="canManage && provider.enabled"
              class="admin-text-button"
              type="button"
              @click="disable(provider)"
            >
              Disable</button
            ><button
              v-if="provider.enabled && !linked(provider)"
              class="admin-text-button"
              type="button"
              @click="startOAuth(provider, 'LINK')"
            >
              Link mine</button
            ><template v-if="linked(provider)"
              ><button
                class="admin-text-button"
                type="button"
                @click="startOAuth(provider, 'REAUTH')"
              >
                Re-authenticate</button
              ><button
                class="admin-text-button"
                type="button"
                @click="unlink(linked(provider)!)"
              >
                Unlink mine
              </button></template
            >
          </div>
        </article>
      </div>
    </section>
    <section v-if="data?.data.currentIdentities.length" class="admin-section">
      <div class="admin-section-heading"><h2>My linked identities</h2></div>
      <div class="admin-activity-list">
        <div
          v-for="identity in data.data.currentIdentities"
          :key="identity.id"
          class="admin-activity-row"
        >
          <span class="admin-status-dot" />
          <div>
            <strong>{{ identity.provider.label }}</strong
            ><span>{{ identity.displayEmail || "Email not shared" }}</span>
          </div>
          <time>{{ new Date(identity.createdAt).toLocaleDateString() }}</time>
        </div>
      </div>
    </section>
  </div>
</template>
