<script setup lang="ts">
import type { PortfolioWorkspaceView } from "~/types/portfolio";

defineProps<
  Pick<
    PortfolioWorkspaceView,
    "pageHeading" | "experience" | "profile" | "linkListContent"
  >
>();
const selectedJob = defineModel<PortfolioWorkspaceView["selectedJob"]>(
  "selectedJob",
  { required: true },
);
</script>

<template>
  <div class="ws-view-heading">
    <span class="ws-kicker">{{ pageHeading.kicker }}</span>
    <h1>{{ pageHeading.heading }}</h1>
    <p>{{ pageHeading.description }}</p>
  </div>
  <div class="ws-experience-workspace">
    <div class="ws-job-selector" role="group" aria-label="Select experience">
      <button
        v-for="(job, index) in experience"
        :key="job.company"
        :aria-pressed="selectedJob === index"
        @click="selectedJob = index"
      >
        <span class="ws-job-marker"
          ><UIcon
            :name="
              [
                'i-lucide-plug-zap',
                'i-lucide-graduation-cap',
                'i-lucide-braces',
              ][index]!
            " /></span
        ><span
          ><small class="mono">{{ job.period }}</small
          ><strong>{{ job.company }}</strong
          ><span>{{ job.role }}</span></span
        ><UIcon name="i-lucide-chevron-right" />
      </button>
    </div>
    <section v-if="experience[selectedJob]" class="ws-job-detail">
      <div class="ws-job-art" aria-hidden="true">
        <UIcon
          :name="
            ['i-lucide-plug-zap', 'i-lucide-graduation-cap', 'i-lucide-braces'][
              selectedJob
            ]!
          "
        />
        <div class="ws-job-art-line" />
        <span>{{
          [
            "EV / CONNECTED SERVICES",
            "SCHOOL / END-TO-END",
            "APIS / INTELLIGENT RETRIEVAL",
          ][selectedJob]
        }}</span>
      </div>
      <span class="ws-kicker">{{ experience[selectedJob]!.period }}</span>
      <h2>{{ experience[selectedJob]!.fullCompany }}</h2>
      <p class="ws-job-summary">
        {{ experience[selectedJob]!.description }}
      </p>
      <ul>
        <li v-for="detail in experience[selectedJob]!.details" :key="detail">
          <UIcon name="i-lucide-arrow-up-right" /><span>{{ detail }}</span>
        </li>
      </ul>
      <div class="ws-tags">
        <span v-for="tag in experience[selectedJob]!.tags" :key="tag">{{
          tag
        }}</span>
      </div>
    </section>
  </div>
  <a
    v-if="profile.resume"
    :href="profile.resume"
    target="_blank"
    rel="noopener"
    class="ws-resume-row"
    ><UIcon name="i-lucide-file-text" /><span
      >{{ linkListContent.heading
      }}<strong>{{ linkListContent.links[0]?.label }}</strong></span
    ><UIcon name="i-lucide-arrow-up-right"
  /></a>
</template>
