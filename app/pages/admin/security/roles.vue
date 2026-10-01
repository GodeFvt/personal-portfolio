<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "admin" });
useSeoMeta({ title: "Roles | Portfolio admin", robots: "noindex, nofollow" });
interface Role { id: string; key: string; name: string; description: string | null; isSystem: boolean; isProtected: boolean; version: number; permissions: Array<{ permissionKey: string }>; _count: { users: number } }
interface Response { data: { roles: Role[]; permissionCatalog: Record<string, string> } }
const { adminSession } = useAdminSession();
const { data, error, refresh } = await useLazyFetch<Response>("/api/admin/security/roles");
const editing = ref<Role | "new" | null>(null);
const key = ref(""); const name = ref(""); const description = ref(""); const selectedPermissions = ref<string[]>([]);
const busy = ref(false); const message = ref(""); const errorMessage = ref("");
const actorPermissions = computed(() => new Set(adminSession.value?.user.permissions ?? []));
const canCreate = computed(() => actorPermissions.value.has("roles.create"));
const canUpdate = computed(() => actorPermissions.value.has("roles.update"));
const delegablePermissions = computed(() => Object.entries(data.value?.data.permissionCatalog ?? {}).filter(([permission]) => actorPermissions.value.has(permission)));

function startCreate() { editing.value = "new"; key.value = ""; name.value = ""; description.value = ""; selectedPermissions.value = []; errorMessage.value = ""; }
function startEdit(role: Role) { editing.value = role; key.value = role.key; name.value = role.name; description.value = role.description ?? ""; selectedPermissions.value = role.permissions.map(({ permissionKey }) => permissionKey); errorMessage.value = ""; }
async function save() {
  if (!editing.value || busy.value) return; busy.value = true; errorMessage.value = ""; message.value = "";
  try {
    if (editing.value === "new") await $fetch("/api/admin/security/roles", { method: "POST", headers: { "x-csrf-token": adminSession.value?.csrfToken ?? "" }, body: { key: key.value, name: name.value, description: description.value || null, permissionKeys: selectedPermissions.value } });
    else await $fetch(`/api/admin/security/roles/${editing.value.id}`, { method: "PATCH", headers: { "x-csrf-token": adminSession.value?.csrfToken ?? "" }, body: { expectedVersion: editing.value.version, name: name.value, description: description.value || null, permissionKeys: selectedPermissions.value } });
    message.value = editing.value === "new" ? "Role created." : "Role updated."; editing.value = null; await refresh();
  } catch (error) { errorMessage.value = (error as { data?: { error?: { message?: string } } }).data?.error?.message ?? "Role could not be saved."; }
  finally { busy.value = false; }
}
async function remove(role: Role) {
  if (busy.value || !confirm(`Delete ${role.name}?`)) return; busy.value = true; errorMessage.value = "";
  try { await $fetch(`/api/admin/security/roles/${role.id}`, { method: "DELETE", headers: { "x-csrf-token": adminSession.value?.csrfToken ?? "" } }); message.value = "Role deleted."; await refresh(); }
  catch (error) { errorMessage.value = (error as { data?: { error?: { message?: string } } }).data?.error?.message ?? "Role could not be deleted."; }
  finally { busy.value = false; }
}
</script>

<template>
  <div class="admin-page">
    <header class="admin-page-header"><div><p class="admin-eyebrow">Access control</p><h1>Roles</h1><p>Permissions are additive. You can only delegate permissions already granted to you.</p></div><button v-if="canCreate" class="admin-secondary-button" type="button" @click="startCreate">Create role</button></header>
    <p v-if="message" class="admin-notice" role="status">{{ message }}</p><p v-if="errorMessage" class="admin-form-error admin-page-error" role="alert">{{ errorMessage }}</p>
    <section v-if="editing" class="admin-editor-grid">
      <div class="admin-editor-pane"><p class="admin-eyebrow">{{ editing === 'new' ? 'New role' : 'Edit role' }}</p><h2>{{ editing === 'new' ? 'Custom access' : editing.name }}</h2><p class="admin-muted">System roles stay protected. Custom roles may contain only permissions you hold.</p></div>
      <form class="admin-editor-pane" @submit.prevent="save">
        <label v-if="editing === 'new'" class="admin-field"><span>Key</span><input v-model="key" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="content-reviewer" /></label>
        <label class="admin-field"><span>Name</span><input v-model="name" required maxlength="80" /></label>
        <label class="admin-field"><span>Description</span><textarea v-model="description" maxlength="500" rows="3" /></label>
        <fieldset class="admin-check-grid admin-permission-checks"><legend>Permissions</legend><label v-for="[permission, label] in delegablePermissions" :key="permission"><input v-model="selectedPermissions" type="checkbox" :value="permission" /><span><code>{{ permission }}</code><small>{{ label }}</small></span></label></fieldset>
        <div class="admin-form-actions"><button class="admin-secondary-button" type="button" @click="editing = null">Cancel</button><button class="admin-primary-button" type="submit" :disabled="busy">{{ busy ? "Saving..." : "Save role" }}</button></div>
      </form>
    </section>
    <AdminSkeleton v-if="!data && !error" :rows="4" /><div v-else-if="error && !data" class="admin-empty-state"><strong>Roles could not be loaded.</strong><button @click="() => refresh()">Try again</button></div>
    <section v-else class="admin-section admin-role-list"><article v-for="role in data?.data.roles" :key="role.id" class="admin-role-row"><div><p class="admin-eyebrow">{{ role.isProtected ? 'Protected' : 'Custom' }}</p><h2>{{ role.name }}</h2><p>{{ role.description }}</p><div v-if="!role.isProtected && canUpdate" class="admin-inline-actions"><button class="admin-text-button" type="button" @click="startEdit(role)">Edit</button><button class="admin-text-button" type="button" :disabled="role._count.users > 0" @click="remove(role)">Delete</button></div></div><div class="admin-permission-list"><code v-for="permission in role.permissions" :key="permission.permissionKey">{{ permission.permissionKey }}</code></div><div class="admin-role-count"><strong>{{ role._count.users }}</strong><span>users</span></div></article></section>
  </div>
</template>
