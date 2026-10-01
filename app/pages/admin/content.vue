<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "admin" });
useSeoMeta({ title: "Content | Portfolio admin", robots: "noindex, nofollow" });

type EntityType = "Profile" | "Project" | "Experience" | "SkillGroup" | "SiteSettings";
interface Revision { id: string; entityType: EntityType; entityId: string; version: number; createdAt: string }
interface Technology { id: string; name: string; sortOrder: number }
interface SkillGroup { id: string; label: string; icon: string; sortOrder: number; version: number; technologies: Technology[] }
interface ContentResponse { data: {
  profile: any; projects: any[]; experiences: any[]; skillGroups: SkillGroup[]; settings: any;
  tabs: Array<{ id: string; label: string; slug: string }>; revisions: Revision[];
} }

const sections: Array<{ type: EntityType; label: string; hint: string }> = [
  { type: "Profile", label: "Profile", hint: "Identity, contact, education" },
  { type: "Project", label: "Projects", hint: "Work, links, highlights" },
  { type: "Experience", label: "Experience", hint: "Roles and timeline" },
  { type: "SkillGroup", label: "Stack", hint: "Skill groups and tools" },
  { type: "SiteSettings", label: "Settings", hint: "Branding, SEO, default tab" },
];
const { adminSession } = useAdminSession();
const { data, error, refresh } = await useLazyFetch<ContentResponse>("/api/admin/content", { key: "admin-content" });
const active = ref<EntityType>("Profile");
const editingId = ref<string>();
const expectedVersion = ref(0);
const saving = ref(false);
const notice = ref("");
const formError = ref("");
const initialized = ref(false);
const form = reactive<Record<string, any>>({});

const canWrite = computed(() => adminSession.value?.user.permissions.includes(active.value === "SiteSettings" ? "settings.write" : "content.write"));
const canPublish = computed(() => adminSession.value?.user.permissions.includes("content.publish"));
const allTechnologies = computed(() => data.value?.data.skillGroups.flatMap((group) => group.technologies.map((technology) => ({ ...technology, group: group.label }))) ?? []);
const activeRevisions = computed(() => data.value?.data.revisions.filter((revision) => revision.entityType === active.value) ?? []);

function apiMessage(error: unknown) { return (error as { data?: { error?: { message?: string } } }).data?.error?.message ?? "The request could not be completed."; }
function lines(value: string) { return value.split("\n").map((item) => item.trim()).filter(Boolean); }
function nullable(value: string | undefined) { return value?.trim() || null; }
function resetObject(values: Record<string, unknown>) { for (const key of Object.keys(form)) delete form[key]; Object.assign(form, values); }

function editProfile() {
  const item = data.value?.data.profile; if (!item) return;
  editingId.value = item.id; expectedVersion.value = item.version;
  resetObject({ ...item, interestsText: Array.isArray(item.interests) ? item.interests.join("\n") : "", educationText: item.education.map((x: any) => `${x.degree} | ${x.institution} | ${x.period}`).join("\n"), socialText: item.socialLinks.map((x: any) => `${x.type} | ${x.label} | ${x.url}`).join("\n") });
}
function editProject(item?: any) {
  active.value = "Project"; editingId.value = item?.id; expectedVersion.value = item?.version ?? 0;
  resetObject(item ? { ...item, highlightsText: item.highlights.map((x: any) => x.text).join("\n"), technologyIds: item.technologies.map((x: any) => x.technologyId) } : { slug: "", name: "", category: "", period: "", summary: "", imageAlt: "", illustration: "", liveUrl: "", repoUrl: "", coverMediaId: null, featured: false, archived: false, sortOrder: data.value?.data.projects.length ?? 0, publicationState: "PUBLISHED", highlightsText: "", technologyIds: [] });
}
function editExperience(item?: any) {
  active.value = "Experience"; editingId.value = item?.id; expectedVersion.value = item?.version ?? 0;
  resetObject(item ? { ...item, detailsText: item.details.map((x: any) => x.text).join("\n"), technologyIds: item.technologies.map((x: any) => x.technologyId) } : { company: "", fullCompany: "", role: "", period: "", description: "", sortOrder: data.value?.data.experiences.length ?? 0, publicationState: "PUBLISHED", detailsText: "", technologyIds: [] });
}
function editSkill(item?: SkillGroup) {
  active.value = "SkillGroup"; editingId.value = item?.id; expectedVersion.value = item?.version ?? 0;
  resetObject(item ? { ...item, technologiesText: item.technologies.map((x) => `${x.id} | ${x.name}`).join("\n") } : { label: "", icon: "i-lucide-code-2", sortOrder: data.value?.data.skillGroups.length ?? 0, technologiesText: "" });
}
function editSettings() {
  const item = data.value?.data.settings; if (!item) return;
  editingId.value = item.id; expectedVersion.value = item.version;
  resetObject({ ...item, displayOptionsText: JSON.stringify(item.displayOptions ?? {}, null, 2) });
}
function loadSection(type: EntityType) {
  active.value = type; notice.value = ""; formError.value = "";
  if (type === "Profile") editProfile();
  else if (type === "Project") editProject();
  else if (type === "Experience") editExperience();
  else if (type === "SkillGroup") editSkill();
  else editSettings();
}
function reloadEditor(type: EntityType) {
  if (type === "Profile") editProfile();
  else if (type === "Project") editProject();
  else if (type === "Experience") editExperience();
  else if (type === "SkillGroup") editSkill();
  else editSettings();
}
watchEffect(() => { if (!initialized.value && data.value?.data) { initialized.value = true; editProfile(); } });

function snapshot() {
  if (active.value === "Profile") return { name: form.name, alias: form.alias, role: form.role, email: form.email, bio: form.bio, focus: form.focus, interests: lines(form.interestsText), location: form.location, legacyPortraitUrl: nullable(form.legacyPortraitUrl), legacyResumeUrl: nullable(form.legacyResumeUrl), portraitMediaId: form.portraitMediaId || null, resumeMediaId: form.resumeMediaId || null, education: lines(form.educationText).map((row) => { const [degree = "", institution = "", period = ""] = row.split("|").map((x) => x.trim()); return { degree, institution, period }; }), socialLinks: lines(form.socialText).map((row) => { const [type = "", label = "", url = ""] = row.split("|").map((x) => x.trim()); return { type, label, url }; }) };
  if (active.value === "Project") return { slug: form.slug, name: form.name, category: form.category, period: form.period, summary: form.summary, imageAlt: form.imageAlt, illustration: nullable(form.illustration), liveUrl: nullable(form.liveUrl), repoUrl: nullable(form.repoUrl), coverMediaId: form.coverMediaId || null, featured: Boolean(form.featured), archived: Boolean(form.archived), sortOrder: Number(form.sortOrder), publicationState: form.publicationState, highlights: lines(form.highlightsText), technologyIds: form.technologyIds ?? [] };
  if (active.value === "Experience") return { company: form.company, fullCompany: form.fullCompany, role: form.role, period: form.period, description: form.description, sortOrder: Number(form.sortOrder), publicationState: form.publicationState, details: lines(form.detailsText), technologyIds: form.technologyIds ?? [] };
  if (active.value === "SkillGroup") return { label: form.label, icon: form.icon, sortOrder: Number(form.sortOrder), technologies: lines(form.technologiesText).map((row) => { const [maybeId, ...rest] = row.split("|").map((x) => x.trim()); return rest.length ? { id: maybeId, name: rest.join(" | ") } : { name: maybeId }; }) };
  return { siteName: form.siteName, logoText: nullable(form.logoText), footerText: nullable(form.footerText), seoTitle: form.seoTitle, seoDescription: form.seoDescription, defaultTabId: form.defaultTabId || null, displayOptions: JSON.parse(form.displayOptionsText || "{}") };
}
async function saveDraft() {
  if (!adminSession.value || saving.value) return;
  saving.value = true; notice.value = ""; formError.value = "";
  try {
    await $fetch("/api/admin/content/drafts", { method: "POST", headers: { "x-csrf-token": adminSession.value.csrfToken }, body: { entityType: active.value, entityId: editingId.value, expectedVersion: expectedVersion.value, snapshot: snapshot() } });
    notice.value = "Draft saved. Review it in the queue before publishing."; await refresh();
    reloadEditor(active.value);
  } catch (error) { formError.value = error instanceof SyntaxError ? "Display options must be valid JSON." : apiMessage(error); }
  finally { saving.value = false; }
}
async function publish(revision: Revision) {
  if (!adminSession.value || saving.value) return;
  saving.value = true; notice.value = ""; formError.value = "";
  try { await $fetch("/api/admin/publish", { method: "POST", headers: { "x-csrf-token": adminSession.value.csrfToken }, body: { revisions: [{ entityType: revision.entityType, entityId: revision.entityId, version: revision.version }] } }); notice.value = "Published. Public APIs now use this version."; await refresh(); reloadEditor(active.value); }
  catch (error) { formError.value = apiMessage(error); } finally { saving.value = false; }
}
</script>

<template>
  <div class="admin-page">
    <header class="admin-page-header"><div><p class="admin-eyebrow">Portfolio content</p><h1>Content workspace</h1><p>Edit typed content safely. Every save creates a private revision until an authorized publisher approves it.</p></div><span class="admin-environment">{{ data?.data.revisions.length ?? 0 }} drafts</span></header>
    <p v-if="notice" class="admin-notice" role="status">{{ notice }}</p><p v-if="formError" class="admin-form-error admin-page-error" role="alert">{{ formError }}</p>
    <AdminSkeleton v-if="!data && !error" variant="editor" :rows="5" />
    <div v-else-if="error && !data" class="admin-empty-state"><strong>Content could not be loaded.</strong><button type="button" @click="() => refresh()">Try again</button></div>
    <template v-else>
      <nav class="admin-content-tabs" aria-label="Content sections"><button v-for="section in sections" :key="section.type" type="button" :class="{ 'is-active': active === section.type }" @click="loadSection(section.type)"><strong>{{ section.label }}</strong><span>{{ section.hint }}</span></button></nav>
      <section v-if="canWrite" class="admin-content-editor">
        <form class="admin-editor-pane" @submit.prevent="saveDraft">
          <div class="admin-section-heading"><div><p class="admin-eyebrow">{{ editingId ? 'Edit draft' : 'New record' }}</p><h2>{{ sections.find((x) => x.type === active)?.label }}</h2></div><button v-if="active === 'Project'" class="admin-text-button" type="button" @click="editProject()">New project</button><button v-else-if="active === 'Experience'" class="admin-text-button" type="button" @click="editExperience()">New experience</button><button v-else-if="active === 'SkillGroup'" class="admin-text-button" type="button" @click="editSkill()">New group</button></div>

          <template v-if="active === 'Profile'">
            <div class="admin-field-row"><label class="admin-field"><span>Name</span><input v-model="form.name" required /></label><label class="admin-field"><span>Alias</span><input v-model="form.alias" required /></label></div>
            <div class="admin-field-row"><label class="admin-field"><span>Role</span><input v-model="form.role" required /></label><label class="admin-field"><span>Email</span><input v-model="form.email" required type="email" /></label></div>
            <label class="admin-field"><span>Bio</span><textarea v-model="form.bio" required rows="5" /></label><label class="admin-field"><span>Current focus</span><textarea v-model="form.focus" required rows="3" /></label>
            <div class="admin-field-row"><label class="admin-field"><span>Location</span><input v-model="form.location" required /></label><label class="admin-field"><span>Interests — one per line</span><textarea v-model="form.interestsText" rows="3" /></label></div>
            <label class="admin-field"><span>Education — Degree | Institution | Period</span><textarea v-model="form.educationText" rows="4" /></label><label class="admin-field"><span>Social links — Type | Label | URL</span><textarea v-model="form.socialText" rows="4" /></label>
            <div class="admin-field-row"><label class="admin-field"><span>Portrait URL fallback</span><input v-model="form.legacyPortraitUrl" placeholder="/images/profile.jpg" /></label><label class="admin-field"><span>Resume URL fallback</span><input v-model="form.legacyResumeUrl" placeholder="/resume/file.pdf" /></label></div>
          </template>

          <template v-else-if="active === 'Project'">
            <div class="admin-field-row"><label class="admin-field"><span>Name</span><input v-model="form.name" required /></label><label class="admin-field"><span>Slug</span><input v-model="form.slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></label></div>
            <div class="admin-field-row"><label class="admin-field"><span>Category</span><input v-model="form.category" required /></label><label class="admin-field"><span>Period</span><input v-model="form.period" required /></label></div><label class="admin-field"><span>Summary</span><textarea v-model="form.summary" required rows="5" /></label><label class="admin-field"><span>Highlights — one per line</span><textarea v-model="form.highlightsText" rows="5" /></label>
            <div class="admin-field-row"><label class="admin-field"><span>Live URL</span><input v-model="form.liveUrl" type="url" /></label><label class="admin-field"><span>Repository URL</span><input v-model="form.repoUrl" type="url" /></label></div><div class="admin-field-row"><label class="admin-field"><span>Image alt</span><input v-model="form.imageAlt" required /></label><label class="admin-field"><span>Illustration variant</span><input v-model="form.illustration" /></label></div>
            <fieldset class="admin-check-grid"><legend>Technologies</legend><label v-for="technology in allTechnologies" :key="technology.id"><input v-model="form.technologyIds" type="checkbox" :value="technology.id" /><span><strong>{{ technology.name }}</strong><small>{{ technology.group }}</small></span></label></fieldset>
            <div class="admin-field-row"><label class="admin-field"><span>Order</span><input v-model.number="form.sortOrder" type="number" min="0" /></label><label class="admin-field"><span>Publish state</span><select v-model="form.publicationState"><option>PUBLISHED</option><option>DRAFT</option><option>ARCHIVED</option></select></label></div><div class="admin-toggle-row"><label><input v-model="form.featured" type="checkbox" /> Featured</label><label><input v-model="form.archived" type="checkbox" /> Archived collection</label></div>
          </template>

          <template v-else-if="active === 'Experience'">
            <div class="admin-field-row"><label class="admin-field"><span>Company key</span><input v-model="form.company" required /></label><label class="admin-field"><span>Company name</span><input v-model="form.fullCompany" required /></label></div><div class="admin-field-row"><label class="admin-field"><span>Role</span><input v-model="form.role" required /></label><label class="admin-field"><span>Period</span><input v-model="form.period" required /></label></div><label class="admin-field"><span>Description</span><textarea v-model="form.description" required rows="4" /></label><label class="admin-field"><span>Details — one per line</span><textarea v-model="form.detailsText" rows="6" /></label>
            <fieldset class="admin-check-grid"><legend>Technologies</legend><label v-for="technology in allTechnologies" :key="technology.id"><input v-model="form.technologyIds" type="checkbox" :value="technology.id" /><span><strong>{{ technology.name }}</strong><small>{{ technology.group }}</small></span></label></fieldset><div class="admin-field-row"><label class="admin-field"><span>Order</span><input v-model.number="form.sortOrder" type="number" min="0" /></label><label class="admin-field"><span>Publish state</span><select v-model="form.publicationState"><option>PUBLISHED</option><option>DRAFT</option><option>ARCHIVED</option></select></label></div>
          </template>

          <template v-else-if="active === 'SkillGroup'">
            <div class="admin-field-row"><label class="admin-field"><span>Label</span><input v-model="form.label" required /></label><label class="admin-field"><span>Icon</span><input v-model="form.icon" required /></label></div><label class="admin-field"><span>Technologies — keep “id | name” for existing rows; use “name” for new rows</span><textarea v-model="form.technologiesText" required rows="12" /></label><label class="admin-field"><span>Order</span><input v-model.number="form.sortOrder" type="number" min="0" /></label>
          </template>

          <template v-else>
            <div class="admin-field-row"><label class="admin-field"><span>Site name</span><input v-model="form.siteName" required /></label><label class="admin-field"><span>Logo text</span><input v-model="form.logoText" /></label></div><label class="admin-field"><span>Footer text</span><input v-model="form.footerText" /></label><label class="admin-field"><span>SEO title</span><input v-model="form.seoTitle" required /></label><label class="admin-field"><span>SEO description</span><textarea v-model="form.seoDescription" required rows="4" /></label><label class="admin-field"><span>Default tab</span><select v-model="form.defaultTabId"><option :value="null">First published tab</option><option v-for="tab in data?.data.tabs" :key="tab.id" :value="tab.id">{{ tab.label }} · /{{ tab.slug }}</option></select></label><label class="admin-field"><span>Display options (JSON)</span><textarea v-model="form.displayOptionsText" rows="7" class="admin-code-input" /></label>
          </template>
          <button class="admin-primary-button" type="submit" :disabled="saving">Save private draft</button>
        </form>

        <aside class="admin-record-list"><div class="admin-section-heading"><div><p class="admin-eyebrow">Published records</p><h2>Select to edit</h2></div></div>
          <button v-if="active === 'Profile'" type="button" @click="editProfile"><strong>{{ data?.data.profile.name }}</strong><span>{{ data?.data.profile.role }}</span></button>
          <button v-for="item in active === 'Project' ? data?.data.projects : active === 'Experience' ? data?.data.experiences : active === 'SkillGroup' ? data?.data.skillGroups : []" :key="item.id" type="button" :class="{ 'is-active': editingId === item.id }" @click="active === 'Project' ? editProject(item) : active === 'Experience' ? editExperience(item) : editSkill(item)"><strong>{{ item.name || item.fullCompany || item.label }}</strong><span>version {{ item.version }} · order {{ item.sortOrder }}</span></button>
          <button v-if="active === 'SiteSettings'" type="button" @click="editSettings"><strong>{{ data?.data.settings.siteName }}</strong><span>version {{ data?.data.settings.version }}</span></button>
        </aside>
      </section>
      <section v-if="activeRevisions.length" class="admin-section"><div class="admin-section-heading"><div><p class="admin-eyebrow">Review queue</p><h2>{{ sections.find((x) => x.type === active)?.label }} drafts</h2></div></div><div class="admin-activity-list"><div v-for="revision in activeRevisions" :key="revision.id" class="admin-activity-row admin-draft-row"><span class="admin-status-dot" /><div><strong>{{ revision.entityType }} · version {{ revision.version }}</strong><span>{{ revision.entityId }}</span></div><button v-if="canPublish" class="admin-secondary-button" type="button" :disabled="saving" @click="publish(revision)">Publish</button><span v-else class="admin-muted">Publisher approval required</span></div></div></section>
    </template>
  </div>
</template>
