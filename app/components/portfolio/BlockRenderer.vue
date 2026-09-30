<script setup lang="ts">
import type { PortfolioApiData, PublicPageBlock } from "~~/shared/types/portfolio-api";

const props = defineProps<{
  block: PublicPageBlock;
  content: PortfolioApiData["content"];
}>();
const emit = defineEmits<{ inspect: [slug: string] }>();

function text(key: string) {
  const value = props.block.props[key];
  return typeof value === "string" ? value : "";
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
    <p>{{ text("content") || text("description") }}</p>
  </section>

  <section v-else-if="block.type === 'image'" class="ws-custom-block ws-custom-image">
    <img
      v-if="text('mediaId')"
      :src="`/api/media/${encodeURIComponent(text('mediaId'))}`"
      :alt="text('alt')"
      loading="lazy"
    />
  </section>

  <section v-else-if="block.type === 'link-list'" class="ws-custom-block ws-archive">
    <div v-if="text('heading')" class="ws-section-title"><h2>{{ text("heading") }}</h2></div>
    <a
      v-for="link in links"
      :key="`${link.label}-${link.url}`"
      :href="link.url"
      target="_blank"
      rel="noopener noreferrer"
    >
      <div><strong>{{ link.label }}</strong><p v-if="link.description">{{ link.description }}</p></div>
      <UIcon name="i-lucide-arrow-up-right" />
    </a>
  </section>

  <section v-else-if="block.type === 'project-grid'" class="ws-custom-block ws-project-gallery">
    <WorkspaceProjectCard
      v-for="project in content.projects ?? []"
      :key="project.id"
      :project="project"
      @inspect="emit('inspect', $event)"
    />
  </section>

  <section v-else-if="block.type === 'timeline'" class="ws-custom-block">
    <article v-for="item in content.experience ?? []" :key="item.id" class="ws-job-detail">
      <span class="ws-kicker">{{ item.period }}</span>
      <h2>{{ item.fullCompany }}</h2>
      <p class="ws-job-summary">{{ item.description }}</p>
    </article>
  </section>

  <section v-else-if="block.type === 'skill-group'" class="ws-custom-block ws-stack-items">
    <div v-for="group in content.skillGroups ?? []" :key="group.id">
      <UIcon :name="group.icon" /><span>{{ group.label }}: {{ group.items.join(", ") }}</span>
    </div>
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
