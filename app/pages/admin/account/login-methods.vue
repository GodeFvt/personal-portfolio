<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "admin" });
useSeoMeta({ title: "My login methods | Portfolio admin", robots: "noindex, nofollow" });

interface Provider { id: string; key: string; type: string; label: string }
interface Identity { id: string; displayEmail: string | null; createdAt: string; provider: { id: string; key: string; label: string; enabled: boolean } }
interface Response { data: { passwordConfigured: boolean; providers: Provider[]; identities: Identity[] } }

const { adminSession, clear } = useAdminSession();
const requestConfirmation = useAdminConfirm();
const { data, error, refresh } = await useLazyFetch<Response>("/api/admin/account/login-methods");
const route = useRoute();
const busy = ref(false);
const message = ref("");
const errorMessage = ref("");

onMounted(() => {
  const result = typeof route.query.oauth === "string" ? route.query.oauth : "";
  const messages: Record<string, string> = {
    linked: "Login method linked.",
    reauthenticated: "Authentication refreshed.",
    cancelled: "Provider sign-in was cancelled.",
    failed: "Provider sign-in could not be completed.",
  };
  if (messages[result]) message.value = messages[result];
});

function linked(provider: Provider) {
  return data.value?.data.identities.find((identity) => identity.provider.id === provider.id);
}

async function startOAuth(provider: Provider, intent: "LINK" | "REAUTH") {
  if (busy.value) return;
  busy.value = true; errorMessage.value = "";
  try {
    const response = await $fetch<{ data: { authorizationUrl: string } }>(`/api/auth/oauth/${provider.key}/start`, {
      method: "POST",
      headers: { "x-csrf-token": adminSession.value?.csrfToken ?? "" },
      body: { intent },
    });
    window.location.assign(response.data.authorizationUrl);
  } catch (error) {
    errorMessage.value = (error as { data?: { error?: { message?: string } } }).data?.error?.message ?? "Login method could not be started.";
    busy.value = false;
  }
}

async function unlink(identity: Identity) {
  if (busy.value || !await requestConfirmation({ title: `Unlink ${identity.provider.label}?`, description: "You may be signed out if this identity is connected to your current session.", confirmLabel: "Unlink identity", tone: "danger" })) return;
  busy.value = true; errorMessage.value = "";
  try {
    const response = await $fetch<{ data: { loggedOut: boolean } }>(`/api/admin/security/identities/${identity.id}`, {
      method: "DELETE",
      headers: { "x-csrf-token": adminSession.value?.csrfToken ?? "" },
    });
    if (response.data.loggedOut) {
      clear();
      await navigateTo("/admin/login");
      return;
    }
    message.value = "Login method unlinked.";
    await refresh();
  } catch (error) {
    errorMessage.value = (error as { data?: { error?: { message?: string } } }).data?.error?.message ?? "Login method could not be unlinked.";
  } finally { busy.value = false; }
}
</script>

<template>
  <div class="admin-page">
    <header class="admin-page-header">
      <div><p class="admin-eyebrow">Account</p><h1>My login methods</h1><p>Connect another provider for recovery or manage the identities used to sign in.</p></div>
    </header>
    <p v-if="message" class="admin-notice" role="status">{{ message }}</p>
    <p v-if="errorMessage" class="admin-form-error admin-page-error" role="alert">{{ errorMessage }}</p>
    <AdminSkeleton v-if="!data && !error" :rows="3" />
    <div v-else-if="error && !data" class="admin-empty-state"><strong>Login methods could not be loaded.</strong><button @click="() => refresh()">Try again</button></div>
    <section v-else class="admin-section">
      <div class="admin-provider-list">
        <article v-if="data?.data.passwordConfigured" class="admin-provider-row"><div><strong>Password</strong><span>Emergency and direct sign-in</span></div><b class="admin-state-label">AVAILABLE</b></article>
        <article v-for="provider in data?.data.providers" :key="provider.id" class="admin-provider-row admin-provider-manage">
          <div><strong>{{ provider.label }}</strong><span>{{ linked(provider)?.displayEmail || `${provider.type} identity` }}</span></div>
          <div class="admin-provider-actions">
            <b class="admin-state-label">{{ linked(provider) ? 'LINKED' : 'AVAILABLE' }}</b>
            <button v-if="!linked(provider)" class="admin-text-button" type="button" :disabled="busy" @click="startOAuth(provider, 'LINK')">Link mine</button>
            <template v-else>
              <button class="admin-text-button" type="button" :disabled="busy" @click="startOAuth(provider, 'REAUTH')">Re-authenticate</button>
              <button class="admin-text-button" type="button" :disabled="busy" @click="unlink(linked(provider)!)">Unlink</button>
            </template>
          </div>
        </article>
      </div>
      <p v-if="!data?.data.passwordConfigured && data?.data.identities.length === 1" class="admin-muted admin-invite-note">This is your only login method. Link another provider before unlinking it.</p>
    </section>
  </div>
</template>
