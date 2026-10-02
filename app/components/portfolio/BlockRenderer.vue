<script setup lang="ts">
import type {
  PortfolioApiData,
  PublicPageBlock,
} from "~~/shared/types/portfolio-api";

const props = defineProps<{
  block: PublicPageBlock;
  content: PortfolioApiData["content"];
}>();
const emit = defineEmits<{ inspect: [slug: string] }>();
const selectedJob = ref(0);
const selectedStack = ref(0);
const router = useRouter();
const actions = computed(() =>
  [props.block.props.primaryAction, props.block.props.secondaryAction].flatMap(
    (value) => {
      if (
        !value ||
        typeof value !== "object" ||
        !("label" in value) ||
        !("tabSlug" in value)
      )
        return [];
      return [{ label: String(value.label), slug: String(value.tabSlug) }];
    },
  ),
);
const focusItems = computed(() =>
  Array.isArray(props.block.props.items)
    ? props.block.props.items.filter(
        (item): item is string => typeof item === "string",
      )
    : [],
);
const pageHeading = computed(() => ({
  kicker: heading("kicker"),
  heading: heading("heading"),
  description: heading("description"),
}));
const profile = computed(() => {
  const value = props.content.profile;
  return {
    name: "",
    alias: "",
    role: "",
    email: "",
    bio: "",
    focus: "",
    interests: [],
    location: "",
    portraitUrl: null,
    resumeUrl: null,
    education: [],
    socialLinks: [],
    ...value,
    portrait: value?.portraitUrl ?? null,
    resume: value?.resumeUrl ?? "",
    github:
      value?.socialLinks.find((link) => link.type === "github")?.url ?? "",
    linkedin:
      value?.socialLinks.find((link) => link.type === "linkedin")?.url ?? "",
  };
});
const projects = computed(() =>
  (props.content.projects ?? []).filter(
    (project) =>
      (props.block.props.includeArchived === true || !project.archived) &&
      (props.block.props.featuredOnly !== true || project.featured),
  ),
);

function text(key: string) {
  const value = props.block.props[key];
  return typeof value === "string" ? value : "";
}

function heading(key: "kicker" | "heading" | "description") {
  const value = props.block.props.heading;
  return value &&
    typeof value === "object" &&
    key in value &&
    typeof (value as Record<string, unknown>)[key] === "string"
    ? String((value as Record<string, unknown>)[key])
    : "";
}

const links = computed(() => {
  const value = props.block.props.links;
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is { label: string; url: string; description?: string } =>
      Boolean(
        item &&
        typeof item === "object" &&
        "label" in item &&
        typeof item.label === "string" &&
        "url" in item &&
        typeof item.url === "string",
      ),
  );
});
</script>

<template>
  <section v-if="block.type === 'text'" class="ws-custom-block ws-custom-text">
    <span v-if="text('kicker')" class="ws-kicker">{{ text("kicker") }}</span>
    <h2 v-if="text('heading')">{{ text("heading") }}</h2>
    <p v-if="block.props.variant === 'hero' && text('fullName')">
      {{ text("fullName") }}
      <span v-if="text('roleLabel')">/ {{ text("roleLabel") }}</span>
    </p>
    <p>{{ text("content") || text("description") }}</p>
    <div v-if="block.props.variant === 'hero'" class="ws-intro-actions">
      <button
        v-for="action in actions"
        :key="action.slug"
        class="ws-subtle-button"
        @click="router.push({ query: { endpoint: action.slug } })"
      >
        {{ action.label }}
      </button>
    </div>
  </section>

  <section
    v-else-if="block.type === 'image'"
    class="ws-custom-block ws-custom-image"
  >
    <img
      v-if="text('mediaId')"
      :src="`/api/media/${encodeURIComponent(text('mediaId'))}`"
      :alt="text('alt')"
      loading="lazy"
    />
  </section>

  <section
    v-else-if="block.type === 'link-list'"
    class="ws-custom-block ws-archive"
  >
    <div v-if="text('heading')" class="ws-section-title">
      <h2>{{ text("heading") }}</h2>
    </div>
    <a
      v-for="link in links"
      :key="`${link.label}-${link.url}`"
      :href="link.url"
      target="_blank"
      rel="noopener noreferrer"
    >
      <div>
        <strong>{{ link.label }}</strong>
        <p v-if="link.description">{{ link.description }}</p>
      </div>
      <UIcon name="i-lucide-arrow-up-right" />
    </a>
  </section>

  <section
    v-else-if="block.type === 'project-grid'"
    class="ws-custom-block ws-project-gallery"
  >
    <div v-if="heading('heading')" class="ws-section-title">
      <span v-if="heading('kicker')" class="ws-kicker">{{
        heading("kicker")
      }}</span>
      <h2>{{ heading("heading") }}</h2>
      <p v-if="heading('description')">{{ heading("description") }}</p>
    </div>
    <WorkspaceProjectCard
      v-for="project in projects"
      :key="project.id"
      :project="project"
      @inspect="emit('inspect', $event)"
    />
  </section>

  <section v-else-if="block.type === 'timeline'" class="ws-custom-block">
    <WorkspaceExperience
      :pageHeading="pageHeading"
      :experience="content.experience ?? []"
      :profile="profile"
      :linkListContent="{ heading: '', links: [] }"
      v-model:selectedJob="selectedJob"
    />
  </section>

  <section
    v-else-if="block.type === 'skill-group'"
    class="ws-custom-block"
  >
    <div v-if="block.props.variant === 'focus-strip'" class="ws-focus-strip">
      <span class="mono ws-muted">{{ text("heading") }}</span
      ><span v-for="item in focusItems" :key="item"
        ><UIcon name="i-lucide-braces" />{{ item }}</span
      >
    </div>
    <WorkspaceStack
      v-else
      :pageHeading="pageHeading"
      :skillGroups="content.skillGroups ?? []"
      v-model:selectedStack="selectedStack"
    />
  </section>
</template>

<style scoped>
.ws-custom-block {
  margin: 0 auto 36px;
  max-width: 960px;
}
.ws-custom-text {
  padding: 24px 0;
}
.ws-custom-text h2 {
  margin: 10px 0;
  font-size: clamp(28px, 5vw, 52px);
}
.ws-custom-text p {
  color: var(--muted);
  line-height: 1.8;
}
.ws-custom-image img {
  display: block;
  width: 100%;
  border-radius: 8px;
}
</style>
