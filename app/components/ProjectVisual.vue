<script setup lang="ts">
import type { Project } from "~~/shared/data/portfolio";
const props = defineProps<{ project: Project }>();
const failed = ref(false);
watch(
  () => props.project.image,
  () => {
    failed.value = false;
  },
);
</script>

<template>
  <div class="project-visual" :class="`visual-${project.kind}`">
    <img
      v-if="project.image && !failed"
      :src="project.image"
      :alt="project.imageAlt"
      loading="lazy"
      width="1200"
      height="750"
      @error="failed = true"
    />
    <template v-else>
      <div
        v-if="project.kind === 'registration'"
        class="registration-art"
        aria-hidden="true"
      >
        <div class="ticket ticket-back">
          <span>PRE-TEST</span><UIcon name="i-lucide-graduation-cap" />
        </div>
        <div class="ticket ticket-front">
          <span class="mono">KANARAT SCHOOL</span
          ><UIcon name="i-lucide-graduation-cap" /><strong
            >One application.<br />A connected journey.</strong
          >
          <div class="ticket-rule" />
          <div class="ticket-bottom mono">
            <span>REGISTER → ALLOCATE → CERTIFY</span
            ><UIcon name="i-lucide-arrow-up-right" />
          </div>
        </div>
      </div>
      <div
        v-else-if="project.kind === 'services'"
        class="services-art"
        aria-hidden="true"
      >
        <div class="service-orbit orbit-one" />
        <div class="service-orbit orbit-two" />
        <div class="service-core"><UIcon name="i-lucide-network" /></div>
        <span class="service-node node-a"><UIcon name="i-lucide-users" /></span
        ><span class="service-node node-b"
          ><UIcon name="i-lucide-database" /></span
        ><span class="service-node node-c"
          ><UIcon name="i-lucide-shield-check" /></span
        ><span class="service-node node-d"
          ><UIcon name="i-lucide-folder"
        /></span>
      </div>
      <div v-else class="kanban-art" aria-hidden="true">
        <div
          v-for="(label, index) in ['PLAN', 'BUILD', 'SHIP']"
          :key="label"
          class="kanban-column"
        >
          <span class="mono">{{ label }}</span>
          <div v-for="n in 3 - index" :key="n" class="kanban-block">
            <UIcon :name="index === 2 ? 'i-lucide-check' : 'i-lucide-minus'" />
          </div>
        </div>
      </div>
      <span class="visual-caption mono"
        >{{
          project.kind === "registration"
            ? "REGISTRATION WORKFLOW"
            : project.kind === "services"
              ? "CONNECTED SCHOOL SERVICES"
              : "FROM IDEA TO DELIVERY"
        }}
        / CONCEPT</span
      >
    </template>
  </div>
</template>
