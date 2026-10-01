<script setup lang="ts">
definePageMeta({ layout: false });
useSeoMeta({ title: "Accept invitation | Portfolio admin", robots: "noindex, nofollow" });

interface Provider { key: string; type: string; label: string }
interface PreviewResponse { data: { email: string; providers: Provider[] } }

const route = useRoute();
const invitationToken = ref(typeof route.query.token === "string" ? route.query.token : "");
const preview = ref<PreviewResponse["data"] | null>(null);
const loading = ref(true);
const busyProvider = ref("");
const errorMessage = ref("");

const oauthMessage = computed(() => {
  const result = typeof route.query.oauth === "string" ? route.query.oauth : "";
  if (result === "cancelled") return "Provider sign-in was cancelled. Choose a login method to try again.";
  if (result === "failed" || result === "invalid") return "The invitation could not be completed. Use the invited email and try again.";
  return "";
});

async function loadInvitation() {
  if (!invitationToken.value) {
    errorMessage.value = "Open the complete invitation link supplied by an administrator.";
    loading.value = false;
    return;
  }
  try {
    const response = await $fetch<PreviewResponse>("/api/auth/invitations/preview", {
      method: "POST",
      body: { token: invitationToken.value },
    });
    preview.value = response.data;
  } catch (error) {
    errorMessage.value = (error as { data?: { error?: { message?: string } } }).data?.error?.message ?? "This invitation could not be opened.";
  } finally {
    loading.value = false;
  }
}

async function continueWith(provider: Provider) {
  if (!invitationToken.value || busyProvider.value) return;
  busyProvider.value = provider.key;
  errorMessage.value = "";
  try {
    const response = await $fetch<{ data: { authorizationUrl: string } }>(`/api/auth/oauth/${provider.key}/start`, {
      method: "POST",
      body: { intent: "INVITE", invitationToken: invitationToken.value },
    });
    sessionStorage.setItem("admin-invitation-token", invitationToken.value);
    window.location.assign(response.data.authorizationUrl);
  } catch (error) {
    errorMessage.value = (error as { data?: { error?: { message?: string } } }).data?.error?.message ?? "This login method could not be started.";
    busyProvider.value = "";
  }
}

onMounted(async () => {
  if (invitationToken.value) sessionStorage.setItem("admin-invitation-token", invitationToken.value);
  else invitationToken.value = sessionStorage.getItem("admin-invitation-token") ?? "";
  await loadInvitation();
});
</script>

<template>
  <main class="admin-login-page">
    <div class="admin-login-theme"><ThemeControl /></div>
    <section class="admin-login-panel" aria-labelledby="accept-title">
      <p class="admin-route-label"><span>INVITE</span> administrator access</p>
      <h1 id="accept-title">Join without a password.</h1>
      <p v-if="preview" class="admin-login-copy">Continue with an account whose verified email is <strong>{{ preview.email }}</strong>.</p>
      <p v-if="oauthMessage" class="admin-form-error" role="alert">{{ oauthMessage }}</p>
      <p v-if="errorMessage" class="admin-form-error" role="alert">{{ errorMessage }}</p>
      <div v-if="loading" class="admin-muted">Checking invitation…</div>
      <div v-else-if="preview?.providers.length" class="admin-oauth-login admin-invite-providers">
        <button v-for="provider in preview.providers" :key="provider.key" class="admin-secondary-button" type="button" :disabled="Boolean(busyProvider)" @click="continueWith(provider)">
          <span>{{ busyProvider === provider.key ? 'Connecting…' : `Continue with ${provider.label}` }}</span>
          <UIcon :name="busyProvider === provider.key ? 'i-lucide-loader-circle' : 'i-lucide-arrow-up-right'" :class="{ 'admin-spin': busyProvider === provider.key }" />
        </button>
      </div>
      <p v-else-if="preview" class="admin-form-error">No external login method is currently available. Ask an administrator to activate one.</p>
      <p class="admin-muted admin-invite-note">The provider must return the exact verified email on this invitation. This link is single-use.</p>
    </section>
  </main>
</template>
