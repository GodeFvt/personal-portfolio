<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "admin" });
useSeoMeta({ title: "Users | Portfolio admin", robots: "noindex, nofollow" });

interface Role { id: string; key: string; name: string; permissions: Array<{ permissionKey: string }> }
interface AdminUser { id: string; email: string; status: "INVITED" | "ACTIVE" | "SUSPENDED"; version: number; createdAt: string; roles: Array<{ role: Pick<Role, "id" | "key" | "name"> }>; _count: { sessions: number } }
interface Invitation { id: string; normalizedEmail: string; intendedRoles: unknown; expiresAt: string; createdAt: string; invitedBy: { email: string } }
interface UsersResponse { data: { items: AdminUser[]; invitations: Invitation[] } }
interface RolesResponse { data: { roles: Array<Role & { isProtected: boolean; version: number }> } }

const { adminSession } = useAdminSession();
const { data, error, refresh } = await useLazyFetch<UsersResponse>("/api/admin/security/users", { query: { perPage: 50 } });
const { data: roleData } = await useLazyFetch<RolesResponse>("/api/admin/security/roles");
const inviteOpen = ref(false);
const inviteEmail = ref("");
const inviteRoleIds = ref<string[]>([]);
const inviteDays = ref(7);
const invitationUrl = ref("");
const selectedUser = ref<AdminUser | null>(null);
const editStatus = ref<"ACTIVE" | "SUSPENDED">("ACTIVE");
const editRoleIds = ref<string[]>([]);
const busy = ref(false);
const message = ref("");
const errorMessage = ref("");

const permissions = computed(() => new Set(adminSession.value?.user.permissions ?? []));
const canInvite = computed(() => permissions.value.has("users.invite") && permissions.value.has("roles.assign"));
const canManage = computed(() => permissions.value.has("users.manage") && permissions.value.has("roles.assign"));
const assignableRoles = computed(() => (roleData.value?.data.roles ?? []).filter((role) => {
  if (role.key === "owner" && !permissions.value.has("ownership.manage")) return false;
  return role.permissions.every(({ permissionKey }) => permissions.value.has(permissionKey));
}));

function beginEdit(user: AdminUser) {
  selectedUser.value = user;
  editStatus.value = user.status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE";
  editRoleIds.value = user.roles.map(({ role }) => role.id);
  message.value = "";
  errorMessage.value = "";
}

async function invite() {
  if (busy.value) return;
  busy.value = true; errorMessage.value = ""; message.value = ""; invitationUrl.value = "";
  try {
    const response = await $fetch<{ data: { acceptUrl: string } }>("/api/admin/security/invitations", {
      method: "POST", headers: { "x-csrf-token": adminSession.value?.csrfToken ?? "" },
      body: { email: inviteEmail.value, roleIds: inviteRoleIds.value, expiresInDays: inviteDays.value },
    });
    invitationUrl.value = response.data.acceptUrl;
    message.value = "Invitation created. Copy the link now; it will not be shown again.";
    inviteEmail.value = ""; inviteRoleIds.value = [];
    await refresh();
  } catch (error) {
    errorMessage.value = (error as { data?: { error?: { message?: string } } }).data?.error?.message ?? "Invitation could not be created.";
  } finally { busy.value = false; }
}

async function saveUser() {
  if (!selectedUser.value || busy.value) return;
  busy.value = true; errorMessage.value = ""; message.value = "";
  try {
    await $fetch(`/api/admin/security/users/${selectedUser.value.id}`, {
      method: "PATCH", headers: { "x-csrf-token": adminSession.value?.csrfToken ?? "" },
      body: { expectedVersion: selectedUser.value.version, status: editStatus.value, roleIds: editRoleIds.value },
    });
    message.value = "User access updated."; selectedUser.value = null; await refresh();
  } catch (error) {
    errorMessage.value = (error as { data?: { error?: { message?: string } } }).data?.error?.message ?? "User access could not be updated.";
  } finally { busy.value = false; }
}

async function revokeInvitation(id: string) {
  if (busy.value || !confirm("Revoke this invitation?")) return;
  busy.value = true; errorMessage.value = "";
  try {
    await $fetch(`/api/admin/security/invitations/${id}`, { method: "DELETE", headers: { "x-csrf-token": adminSession.value?.csrfToken ?? "" } });
    message.value = "Invitation revoked."; await refresh();
  } catch (error) {
    errorMessage.value = (error as { data?: { error?: { message?: string } } }).data?.error?.message ?? "Invitation could not be revoked.";
  } finally { busy.value = false; }
}

async function copyInvitation() {
  await navigator.clipboard.writeText(invitationUrl.value);
  message.value = "Invitation link copied.";
}
</script>

<template>
  <div class="admin-page">
    <header class="admin-page-header">
      <div><p class="admin-eyebrow">Security</p><h1>Users</h1><p>Invite passwordless administrators, assign roles, and suspend access. Changes are enforced on the server immediately.</p></div>
      <button v-if="canInvite" class="admin-secondary-button" type="button" @click="inviteOpen = !inviteOpen">{{ inviteOpen ? "Close" : "Invite user" }}</button>
    </header>
    <p v-if="message" class="admin-notice" role="status">{{ message }}</p>
    <p v-if="errorMessage" class="admin-form-error admin-page-error" role="alert">{{ errorMessage }}</p>

    <section v-if="inviteOpen" class="admin-editor-grid">
      <div class="admin-editor-pane"><p class="admin-eyebrow">New invitation</p><h2>Invite an administrator</h2><p class="admin-muted">The single-use link activates the account through a verified Google, Microsoft, or GitHub identity. No password is created.</p></div>
      <form class="admin-editor-pane" @submit.prevent="invite">
        <label class="admin-field"><span>Email</span><input v-model="inviteEmail" type="email" required maxlength="320" /></label>
        <label class="admin-field"><span>Expires in days</span><input v-model.number="inviteDays" type="number" min="1" max="30" required /></label>
        <fieldset class="admin-check-grid"><legend>Roles</legend><label v-for="role in assignableRoles" :key="role.id"><input v-model="inviteRoleIds" type="checkbox" :value="role.id" /> <span>{{ role.name }}</span></label></fieldset>
        <button class="admin-primary-button" type="submit" :disabled="busy || !inviteRoleIds.length">{{ busy ? "Creating..." : "Create invitation" }}</button>
        <div v-if="invitationUrl" class="admin-copy-field"><input :value="invitationUrl" readonly /><button type="button" class="admin-secondary-button" @click="copyInvitation">Copy</button></div>
      </form>
    </section>

    <AdminSkeleton v-if="!data && !error" :rows="5" />
    <div v-else-if="error && !data" class="admin-empty-state"><strong>Users could not be loaded.</strong><button @click="() => refresh()">Try again</button></div>
    <template v-else>
      <section v-if="data?.data.invitations.length" class="admin-section">
        <div class="admin-section-heading"><h2>Pending invitations</h2></div>
        <div class="admin-activity-list"><div v-for="invitation in data.data.invitations" :key="invitation.id" class="admin-activity-row"><span class="admin-status-dot" /><div><strong>{{ invitation.normalizedEmail }}</strong><span>Expires {{ new Date(invitation.expiresAt).toLocaleString() }}</span></div><button class="admin-text-button" type="button" @click="revokeInvitation(invitation.id)">Revoke</button></div></div>
      </section>

      <section class="admin-section">
        <div class="admin-section-heading"><h2>Administrators</h2></div>
        <div class="admin-data-table">
          <div class="admin-table-head" :class="{ 'admin-table-row-action': canManage }"><span>Account</span><span>Roles</span><span>Sessions</span><span>Status</span><span v-if="canManage">Action</span></div>
          <div v-for="user in data?.data.items" :key="user.id" class="admin-table-row" :class="{ 'admin-table-row-action': canManage }">
            <div><strong>{{ user.email }}</strong><small>{{ new Date(user.createdAt).toLocaleDateString() }}</small></div>
            <span>{{ user.roles.map(({ role }) => role.name).join(', ') || 'No role' }}</span><span>{{ user._count.sessions }}</span><span class="admin-state-label">{{ user.status }}</span>
            <button v-if="canManage && user.status !== 'INVITED'" class="admin-text-button" type="button" @click="beginEdit(user)">Manage</button>
          </div>
          <p v-if="!data?.data.items.length" class="admin-muted admin-table-empty">No administrators yet. Bootstrap the first Owner from the operator script.</p>
        </div>
      </section>
    </template>

    <section v-if="selectedUser" class="admin-editor-grid">
      <div class="admin-editor-pane"><p class="admin-eyebrow">Access</p><h2>{{ selectedUser.email }}</h2><p class="admin-muted">Suspending an account revokes all of its active sessions.</p></div>
      <form class="admin-editor-pane" @submit.prevent="saveUser">
        <label class="admin-field"><span>Status</span><select v-model="editStatus"><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option></select></label>
        <fieldset class="admin-check-grid"><legend>Roles</legend><label v-for="role in assignableRoles" :key="role.id"><input v-model="editRoleIds" type="checkbox" :value="role.id" /> <span>{{ role.name }}</span></label></fieldset>
        <div class="admin-form-actions"><button class="admin-secondary-button" type="button" @click="selectedUser = null">Cancel</button><button class="admin-primary-button" type="submit" :disabled="busy || !editRoleIds.length">{{ busy ? "Saving..." : "Save access" }}</button></div>
      </form>
    </section>
  </div>
</template>
