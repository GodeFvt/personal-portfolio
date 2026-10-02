<script setup lang="ts">
import type { PortfolioWorkspaceView } from "~/types/portfolio";

const router = useRouter();

defineProps<
  Pick<
    PortfolioWorkspaceView,
    | "profile"
    | "introductionHero"
    | "introductionHeadingLines"
    | "introductionFocus"
    | "introductionProjectsHeading"
    | "introductionOrigin"
    | "projects"
    | "navigateTemplate"
    | "inspectProject"
  >
>();
</script>

<template>
  <div class="ws-preview-topline">
    <span class="mono"
      ><span class="ws-pink">const</span> developer =
      <span class="ws-muted">a real person</span></span
    ><span class="ws-preview-location"
      ><UIcon name="i-lucide-map-pin" />{{ profile.location }}</span
    >
  </div>
  <section class="ws-intro">
    <div class="ws-intro-copy">
      <p class="ws-kicker">{{ introductionHero.kicker }}</p>
      <h1>
        <span
          v-for="line in introductionHeadingLines"
          :key="line"
          class="ws-intro-title-line"
          >{{ line }}</span
        >
      </h1>
      <p class="ws-full-name">
        {{ introductionHero.fullName || profile.name }}
        <span>/ {{ introductionHero.roleLabel || profile.role }}</span>
      </p>
      <p class="ws-intro-description">{{ introductionHero.description }}</p>
      <div class="ws-intro-actions">
        <button
          class="ws-pink-button"
          @click="
            router.push({
              query: { endpoint: introductionHero.primarySlug || 'projects' },
            })
          "
        >
          {{ introductionHero.primaryAction }}
          <UIcon name="i-lucide-arrow-up-right" /></button
        ><button
          class="ws-subtle-button"
          @click="
            router.push({
              query: { endpoint: introductionHero.secondarySlug || 'contact' },
            })
          "
        >
          {{ introductionHero.secondaryAction }}
          <UIcon name="i-lucide-arrow-right" />
        </button>
      </div>
    </div>
    <WorkspacePortraitGraph
      :src="profile.portrait"
      :alt="`${profile.alias}, ${profile.name}`"
    />
  </section>
  <div class="ws-focus-strip">
    <span class="mono ws-muted">{{ introductionFocus.heading }}</span>
    <span v-for="item in introductionFocus.items" :key="item"
      ><UIcon name="i-lucide-braces" />{{ item }}</span
    >
  </div>
  <section class="ws-featured">
    <div class="ws-section-title">
      <div>
        <h2>{{ introductionProjectsHeading.heading }}</h2>
        <p>{{ introductionProjectsHeading.description }}</p>
      </div>
      <button @click="navigateTemplate('project-list')">
        All projects <UIcon name="i-lucide-arrow-up-right" />
      </button>
    </div>
    <div class="ws-projects-grid">
      <WorkspaceProjectCard
        v-for="project in projects"
        :key="project.slug"
        :project="project"
        compact
        @inspect="inspectProject"
      />
    </div>
  </section>
  <section class="ws-origin">
    <div class="ws-origin-symbol">
      <UIcon name="i-lucide-bot" />
    </div>
    <div>
      <span class="ws-kicker">{{ introductionOrigin.kicker }}</span>
      <h2>{{ introductionOrigin.heading }}</h2>
      <p>{{ introductionOrigin.description }}</p>
    </div>
    <button
      class="ws-subtle-button"
      @click="navigateTemplate('experience-list')"
    >
      The journey <UIcon name="i-lucide-arrow-right" />
    </button>
  </section>
  <div v-if="profile.education[0]" class="ws-education">
    <UIcon name="i-lucide-graduation-cap" />
    <p>
      <strong>{{ profile.education[0].degree }}</strong
      ><span>{{ profile.education[0].institution }}</span>
    </p>
    <span class="mono">{{ profile.education[0].period }}</span>
  </div>
</template>
