<script setup lang="ts">
const route = useRoute();
const { adminSession, clear } = useAdminSession();
const mobileOpen = ref(false);
const loggingOut = ref(false);

const navigation = [
  { label: "Overview", to: "/admin", icon: "i-lucide-layout-dashboard" },
  { label: "Navigation", to: "/admin/navigation", icon: "i-lucide-panel-left" },
];

const securityNavigation = [
  { label: "Users", to: "/admin/security/users", permission: "users.read" },
  { label: "Roles", to: "/admin/security/roles", permission: "roles.read" },
  { label: "Login methods", to: "/admin/security/login-methods", permission: "auth.providers.read" },
  { label: "Audit", to: "/admin/security/audit", permission: "audit.read" },
];

const visibleSecurityNavigation = computed(() =>
  securityNavigation.filter((item) => adminSession.value?.user.permissions.includes(item.permission)),
);

async function logout() {
  if (!adminSession.value || loggingOut.value) return;
  loggingOut.value = true;
  try {
    await $fetch("/api/auth/logout", {
      method: "POST",
      headers: { "x-csrf-token": adminSession.value.csrfToken },
    });
  } finally {
    clear();
    await navigateTo("/admin/login");
    loggingOut.value = false;
  }
}

watch(() => route.fullPath, () => {
  mobileOpen.value = false;
});
</script>

<template>
  <div class="admin-shell">
    <header class="admin-mobile-header">
      <NuxtLink class="admin-wordmark" to="/admin"><span>p:</span> control</NuxtLink>
      <button class="admin-icon-button" type="button" aria-label="Toggle admin navigation" @click="mobileOpen = !mobileOpen">
        <UIcon :name="mobileOpen ? 'i-lucide-x' : 'i-lucide-menu'" />
      </button>
    </header>

    <aside class="admin-sidebar" :class="{ 'is-open': mobileOpen }">
      <div class="admin-sidebar-top">
        <NuxtLink class="admin-wordmark" to="/admin"><span>p:</span> control</NuxtLink>
        <span class="admin-environment">Phase 3</span>
      </div>

      <nav class="admin-navigation" aria-label="Admin navigation">
        <p class="admin-nav-label">Content</p>
        <NuxtLink v-for="item in navigation" :key="item.to" :to="item.to" class="admin-nav-link" :class="{ 'is-active': route.path === item.to }">
          <UIcon :name="item.icon" /><span>{{ item.label }}</span>
        </NuxtLink>

        <template v-if="visibleSecurityNavigation.length">
          <p class="admin-nav-label">Security</p>
          <NuxtLink v-for="item in visibleSecurityNavigation" :key="item.to" :to="item.to" class="admin-nav-link" :class="{ 'is-active': route.path === item.to }">
            <UIcon name="i-lucide-shield-check" /><span>{{ item.label }}</span>
          </NuxtLink>
        </template>
      </nav>

      <div class="admin-identity">
        <div>
          <strong>{{ adminSession?.user.email }}</strong>
          <span>{{ adminSession?.user.roles.map((role) => role.name).join(' · ') }}</span>
        </div>
        <button class="admin-icon-button" type="button" aria-label="Log out" :disabled="loggingOut" @click="logout">
          <UIcon name="i-lucide-log-out" />
        </button>
      </div>
    </aside>

    <main class="admin-main">
      <slot />
    </main>
  </div>
</template>
