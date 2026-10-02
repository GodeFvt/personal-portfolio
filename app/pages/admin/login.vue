<script setup lang="ts">
import { createAuthApi } from "~/lib/api/auth";
import { apiMessage } from "~/lib/api/client";
import type { ProvidersResponse } from "~/types/admin/login";

const authApi = createAuthApi(useNuxtApp().$api);

definePageMeta({ layout: false, middleware: "admin-guest" });

const email = ref("");
const password = ref("");
const errorMessage = ref("");
const submitting = ref(false);
const { clear } = useAdminSession();

const { data: providers } = await useApiData<ProvidersResponse>(
  authApi.providers,
  { lazy: true },
);
const route = useRoute();
const oauthMessage = computed(() => {
  const result = typeof route.query.oauth === "string" ? route.query.oauth : "";
  if (result === "cancelled") return "OAuth sign-in was cancelled.";
  if (result === "failed" || result === "invalid")
    return "OAuth sign-in could not be completed.";
  return "";
});

useSeoMeta({
  title: "Admin login | Phuttinan Workspace",
  robots: "noindex, nofollow",
});

async function submit() {
  if (submitting.value) return;
  submitting.value = true;
  errorMessage.value = "";
  try {
    await authApi.login({
      data: { email: email.value, password: password.value },
    });
    clear();
    await navigateTo("/admin");
  } catch (error) {
    errorMessage.value = apiMessage(
      error,
      "Unable to sign in. Please try again.",
    );
  } finally {
    submitting.value = false;
  }
}

async function startOAuth(provider: string) {
  errorMessage.value = "";
  try {
    const response = await authApi.startOAuth(provider, {
      data: { intent: "LOGIN" },
    });
    window.location.assign(response.data.authorizationUrl);
  } catch (error) {
    errorMessage.value = apiMessage(error, "OAuth sign-in is unavailable.");
  }
}
</script>

<template>
  <main class="admin-login-page">
    <NuxtLink class="admin-wordmark admin-login-brand" to="/"
      ><span>p:</span> control</NuxtLink
    >
    <div class="admin-login-theme">
      <ThemeControl />
    </div>
    <section class="admin-login-panel" aria-labelledby="admin-login-title">
      <p class="admin-route-label"><span>POST</span> /admin/session</p>
      <h1 id="admin-login-title">Sign in to manage the portfolio.</h1>

      <form class="admin-form" @submit.prevent="submit">
        <label>
          <span>Email</span>
          <input
            v-model="email"
            type="email"
            autocomplete="username"
            required
            maxlength="320"
          />
        </label>
        <label>
          <span>Password</span>
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
            maxlength="128"
          />
        </label>
        <p
          v-if="errorMessage || oauthMessage"
          class="admin-form-error"
          role="alert"
        >
          {{ errorMessage || oauthMessage }}
        </p>
        <button
          class="admin-primary-button"
          type="submit"
          :disabled="submitting"
        >
          <span>{{ submitting ? "Signing in..." : "Sign in" }}</span>
          <UIcon
            :name="
              submitting ? 'i-lucide-loader-circle' : 'i-lucide-arrow-right'
            "
            :class="{ 'admin-spin': submitting }"
          />
        </button>
      </form>
      <div v-if="providers?.data.providers.length" class="admin-oauth-login">
        <span>or continue with</span>
        <button
          v-for="provider in providers.data.providers"
          :key="provider.key"
          class="admin-secondary-button"
          type="button"
          @click="startOAuth(provider.key)"
        >
          {{ provider.label }}
        </button>
      </div>
    </section>
  </main>
</template>
