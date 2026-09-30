<script setup lang="ts">
definePageMeta({ layout: false });

const email = ref("");
const password = ref("");
const errorMessage = ref("");
const submitting = ref(false);
const { clear } = useAdminSession();

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
</script>

<template>
  <main class="admin-login-page">
    <NuxtLink class="admin-wordmark admin-login-brand" to="/"><span>p:</span> control</NuxtLink>
    <section class="admin-login-panel" aria-labelledby="admin-login-title">
      <p class="admin-eyebrow">Private workspace</p>
      <h1 id="admin-login-title">Sign in to manage the portfolio.</h1>
      <p class="admin-login-intro">Password access is available to invited administrators only.</p>

      <form class="admin-form" @submit.prevent="submit">
        <label>
          <span>Email</span>
          <input v-model="email" type="email" autocomplete="username" required maxlength="320" />
        </label>
        <label>
          <span>Password</span>
          <input v-model="password" type="password" autocomplete="current-password" required maxlength="128" />
        </label>
        <p v-if="errorMessage" class="admin-form-error" role="alert">{{ errorMessage }}</p>
        <button class="admin-primary-button" type="submit" :disabled="submitting">
          <span>{{ submitting ? "Signing in…" : "Sign in" }}</span>
          <UIcon :name="submitting ? 'i-lucide-loader-circle' : 'i-lucide-arrow-right'" :class="{ 'admin-spin': submitting }" />
        </button>
      </form>
    </section>
    <p class="admin-login-footnote">Sessions expire after 8 hours and can be revoked immediately.</p>
  </main>
</template>
