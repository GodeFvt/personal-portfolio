<script setup lang="ts">
definePageMeta({ layout: false, middleware: "admin-guest" });

const email = ref("");
const password = ref("");
const errorMessage = ref("");
const submitting = ref(false);
const { clear } = useAdminSession();
interface ProvidersResponse { data: { password: { enabled: boolean }; providers: Array<{ key: string; type: string; label: string }> } }
const { data: providers } = await useLazyFetch<ProvidersResponse>("/api/auth/providers");
const route = useRoute();
const oauthMessage = computed(() => {
  const result = typeof route.query.oauth === "string" ? route.query.oauth : "";
  if (result === "cancelled") return "OAuth sign-in was cancelled.";
  if (result === "failed" || result === "invalid") return "OAuth sign-in could not be completed.";
  return "";
});

useSeoMeta({ title: "Admin login | Phuttinan Workspace", robots: "noindex, nofollow" });

async function submit() {
  if (submitting.value) return;
  submitting.value = true;
  errorMessage.value = "";
  try {
    await $fetch("/api/auth/login", {
      method: "POST",
      body: { email: email.value, password: password.value },
    });
    clear();
    await navigateTo("/admin");
  } catch (error) {
    const fetchError = error as { data?: { error?: { message?: string } } };
    errorMessage.value = fetchError.data?.error?.message ?? "Unable to sign in. Please try again.";
  } finally {
    submitting.value = false;
  }
}

async function startOAuth(provider: string) {
  errorMessage.value = "";
  try {
    const response = await $fetch<{ data: { authorizationUrl: string } }>(`/api/auth/oauth/${provider}/start`, { method: "POST", body: { intent: "LOGIN" } });
    window.location.assign(response.data.authorizationUrl);
  } catch (error) {
    errorMessage.value = (error as { data?: { error?: { message?: string } } }).data?.error?.message ?? "OAuth sign-in is unavailable.";
  }
}
</script>

<template>
  <main class="admin-login-page">
    <NuxtLink class="admin-wordmark admin-login-brand" to="/"><span>p:</span> control</NuxtLink>
    <div class="admin-login-theme">
      <ThemeControl />
    </div>
    <section class="admin-login-panel" aria-labelledby="admin-login-title">
      <p class="admin-route-label"><span>POST</span> /admin/session</p>
      <h1 id="admin-login-title">Sign in to manage the portfolio.</h1>

      <form class="admin-form" @submit.prevent="submit">
        <label>
          <span>Email</span>
          <input v-model="email" type="email" autocomplete="username" required maxlength="320" />
        </label>
        <label>
          <span>Password</span>
          <input v-model="password" type="password" autocomplete="current-password" required maxlength="128" />
        </label>
        <p v-if="errorMessage || oauthMessage" class="admin-form-error" role="alert">{{ errorMessage || oauthMessage }}</p>
        <button class="admin-primary-button" type="submit" :disabled="submitting">
          <span>{{ submitting ? "Signing in..." : "Sign in" }}</span>
          <UIcon :name="submitting ? 'i-lucide-loader-circle' : 'i-lucide-arrow-right'" :class="{ 'admin-spin': submitting }" />
        </button>
      </form>
      <div v-if="providers?.data.providers.length" class="admin-oauth-login">
        <span>or continue with</span>
        <button v-for="provider in providers.data.providers" :key="provider.key" class="admin-secondary-button" type="button" @click="startOAuth(provider.key)">{{ provider.label }}</button>
      </div>
    </section>
  </main>
</template>
