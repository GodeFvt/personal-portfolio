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

const accountNavigation = [
  { label: "My login methods", to: "/admin/account/login-methods", icon: "i-lucide-key-round" },
];

const visibleSecurityNavigation = computed(() =>
  securityNavigation.filter((item) => adminSession.value?.user.permissions.includes(item.permission)),
);

const allNavigation = [...navigation, ...accountNavigation, ...securityNavigation];
const currentPage = computed(() => allNavigation.find((item) => item.to === route.path)?.label ?? "Admin");

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
    <header class="admin-topbar">
      <div class="admin-brand-area">
        <button class="admin-icon-button admin-menu-button" type="button" aria-label="Toggle admin navigation" :aria-expanded="mobileOpen" @click="mobileOpen = !mobileOpen">
          <UIcon :name="mobileOpen ? 'i-lucide-x' : 'i-lucide-panel-left'" />
        </button>
        <NuxtLink class="admin-brand" to="/admin">
          <span class="admin-brand-mark">p<span>:</span></span>
          <strong>phuttinan<span>.workspace</span></strong>
        </NuxtLink>
      </div>

      <div class="admin-context" aria-label="Current location">
        <span>Admin</span><UIcon name="i-lucide-chevron-right" /><strong>{{ currentPage }}</strong>
      </div>

      <div class="admin-top-actions">
        <ThemeControl />
        <NuxtLink class="admin-view-site" to="/" target="_blank">View site <UIcon name="i-lucide-arrow-up-right" /></NuxtLink>
      </div>
    </header>

    <aside class="admin-sidebar" :class="{ 'is-open': mobileOpen }">
      <div class="admin-sidebar-intro">
        <span class="admin-method">ADMIN</span>
        <p>Manage portfolio content and access.</p>
      </div>

      <nav class="admin-navigation" aria-label="Admin navigation">
        <p class="admin-nav-label">Content</p>
        <NuxtLink v-for="item in navigation" :key="item.to" :to="item.to" class="admin-nav-link" :class="{ 'is-active': route.path === item.to }">
          <UIcon :name="item.icon" /><span>{{ item.label }}</span><UIcon class="admin-nav-arrow" name="i-lucide-chevron-right" />
        </NuxtLink>

        <p class="admin-nav-label">Account</p>
        <NuxtLink v-for="item in accountNavigation" :key="item.to" :to="item.to" class="admin-nav-link" :class="{ 'is-active': route.path === item.to }">
          <UIcon :name="item.icon" /><span>{{ item.label }}</span><UIcon class="admin-nav-arrow" name="i-lucide-chevron-right" />
        </NuxtLink>

        <template v-if="visibleSecurityNavigation.length">
          <p class="admin-nav-label">Security</p>
          <NuxtLink v-for="item in visibleSecurityNavigation" :key="item.to" :to="item.to" class="admin-nav-link" :class="{ 'is-active': route.path === item.to }">
            <UIcon name="i-lucide-shield-check" /><span>{{ item.label }}</span><UIcon class="admin-nav-arrow" name="i-lucide-chevron-right" />
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

    <button v-if="mobileOpen" class="admin-sidebar-scrim" type="button" aria-label="Close admin navigation" @click="mobileOpen = false" />

    <main class="admin-main">
      <slot />
    </main>
  </div>
</template>
