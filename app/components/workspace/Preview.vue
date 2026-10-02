<script setup lang="ts">
import type { PortfolioPreviewProps } from "~/types/portfolio";
const props = defineProps<PortfolioPreviewProps>();
const projectFilter = defineModel<string>("projectFilter", { required: true });
const responseData = computed(() => props.response?.data ?? null);
const site = computed(() => props.site);
const {
  profile,
  projects,
  displayedProjects,
  archive,
  experience,
  skillGroups,
  pageHeading,
  introductionHero,
  introductionHeadingLines,
  introductionOrigin,
  introductionFocus,
  introductionProjectsHeading,
  contactSignoff,
  linkListContent,
  contactSocialLinks,
} = usePortfolioContent(responseData, site);
const selectedJob = ref(0);
const selectedStack = ref(0);
watch(
  () => props.activeId,
  () => {
    selectedJob.value = 0;
    selectedStack.value = 0;
  },
);
</script>

<template>
  <div
    id="workspace-content"
    :ref="setContentPane"
    class="ws-content"
    role="tabpanel"
    :aria-labelledby="`${responseTab}-tab`"
    tabindex="0"
  >
    <div
      v-if="showSkeleton"
      class="ws-skeleton"
      role="status"
      aria-live="polite"
      aria-label="Loading portfolio content"
    >
      <span class="ws-skeleton-line ws-skeleton-kicker" />
      <span class="ws-skeleton-line ws-skeleton-title" />
      <span class="ws-skeleton-line ws-skeleton-copy" />
      <span class="ws-skeleton-line ws-skeleton-copy ws-skeleton-copy-short" />
      <div class="ws-skeleton-grid" aria-hidden="true">
        <span v-for="item in 3" :key="item" class="ws-skeleton-card" />
      </div>
      <span class="sr-only">Loading…</span>
    </div>
    <div v-else-if="responseTab === 'json'" class="ws-code-view">
      <div class="ws-code-heading">
        <div>
          <UIcon name="i-lucide-file-json" /><span>{{ activeId }}.json</span>
        </div>
        <span>{{
          response !== null ? "Live API response" : "Saved portfolio data"
        }}</span>
      </div>
      <div class="ws-code-lines">
        <div v-for="(line, index) in responseJson.split('\n')" :key="index">
          <span class="ws-line-number" aria-hidden="true">{{ index + 1 }}</span
          ><code>{{ line }}</code>
        </div>
      </div>
    </div>
    <div v-else-if="responseTab === 'headers'" class="ws-headers-view">
      <div class="ws-view-heading">
        <span class="ws-kicker">RESPONSE METADATA</span>
        <h1>Under the hood.</h1>
        <p>Actual response headers from this Nuxt server.</p>
      </div>
      <table v-if="responseHeaders.length">
        <thead>
          <tr>
            <th>Header</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="[name, value] in responseHeaders" :key="name">
            <td>{{ name }}</td>
            <td>{{ value }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else class="ws-empty-state">
        <UIcon name="i-lucide-send" />
        <h2>No response headers yet.</h2>
        <p>Send a request to inspect the server's response.</p>
        <button class="ws-pink-button" :disabled="loading" @click="sendRequest">
          {{ loading ? "Sending…" : "Send request"
          }}<UIcon name="i-lucide-arrow-right" />
        </button>
      </div>
    </div>
    <Transition
      v-else
      name="ws-view"
      mode="out-in"
      @after-enter="resetPreviewScroll"
    >
      <div :key="activeId" class="ws-preview">
        <WorkspaceIntroduction
          v-if="activeTemplate === 'introduction'"
          :profile="profile"
          :introductionHero="introductionHero"
          :introductionHeadingLines="introductionHeadingLines"
          :introductionFocus="introductionFocus"
          :introductionProjectsHeading="introductionProjectsHeading"
          :introductionOrigin="introductionOrigin"
          :projects="projects"
          :navigateTemplate="navigateTemplate"
          :inspectProject="inspectProject"
        />
        <WorkspaceProjects
          v-else-if="activeTemplate === 'project-list'"
          :pageHeading="pageHeading"
          :displayedProjects="displayedProjects"
          :linkListContent="linkListContent"
          :archive="archive"
          :inspectProject="inspectProject"
          v-model:projectFilter="projectFilter"
        />
        <WorkspaceExperience
          v-else-if="activeTemplate === 'experience-list'"
          :pageHeading="pageHeading"
          :experience="experience"
          :profile="profile"
          :linkListContent="linkListContent"
          v-model:selectedJob="selectedJob"
        />
        <WorkspaceStack
          v-else-if="activeTemplate === 'skill-list'"
          :pageHeading="pageHeading"
          :skillGroups="skillGroups"
          v-model:selectedStack="selectedStack"
        />
        <WorkspaceContact
          v-else-if="activeTemplate === 'contact'"
          :pageHeading="pageHeading"
          :profile="profile"
          :linkListContent="linkListContent"
          :contactSocialLinks="contactSocialLinks"
          :contactSignoff="contactSignoff"
          :copy="copy"
        />
        <template v-else>
          <PortfolioBlockRenderer
            v-for="block in responseData?.blocks ?? []"
            :key="block.id"
            :block="block"
            :content="responseData?.content ?? {}"
            @inspect="inspectProject"
          />
        </template>
        <footer class="ws-preview-footer">
          <span>{{ site?.settings.footerText }}</span
          ><button
            v-if="activeTemplate !== 'contact'"
            @click="navigateTemplate('contact')"
          >
            Have a conversation
            <UIcon name="i-lucide-arrow-up-right" /></button
          ><button v-else @click="navigateTemplate('introduction')">
            Back to introduction <UIcon name="i-lucide-arrow-up-left" />
          </button>
        </footer>
      </div>
    </Transition>
  </div>
</template>
