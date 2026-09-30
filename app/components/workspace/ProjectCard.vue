<script setup lang="ts">
import type { PublicProject } from "~~/shared/types/portfolio-api";
defineProps<{ project: PublicProject; compact?: boolean }>();
const emit = defineEmits<{ inspect: [slug: string] }>();
</script>

<template>
  <article class="ws-project-card" :class="{ 'ws-project-compact': compact }">
    <button
      class="ws-project-cover"
      :aria-label="`Explore ${project.name}`"
      @click="emit('inspect', project.slug)"
    >
      <ProjectVisual :project="project" /><span class="ws-project-open"
        ><UIcon name="i-lucide-arrow-up-right"
      /></span>
    </button>
    <div class="ws-project-info">
      <p>{{ project.category.split(" / ")[0] }}</p>
      <button @click="emit('inspect', project.slug)">
        {{ project.name }}<UIcon name="i-lucide-arrow-up-right" />
      </button>
      <p v-if="!compact" class="ws-project-description">
        {{ project.summary }}
      </p>
      <div class="ws-project-tech mono">
        <span
          v-for="tech in project.stack.slice(0, compact ? 3 : 5)"
          :key="tech"
          >{{ tech }}</span
        >
      </div>
    </div>
  </article>
</template>

<style scoped>
.ws-project-card {
  min-width: 0;
}
.ws-project-cover {
  width: 100%;
  display: block;
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  text-align: left;
}
.ws-project-cover:focus-visible {
  outline-offset: 4px;
}
.ws-project-open {
  position: absolute;
  right: 12px;
  top: 12px;
  width: 28px;
  height: 28px;
  border: 1px solid #ffffff25;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #d1d1d1;
  background: #19191950;
  opacity: 0;
  transform: translateY(4px);
  transition:
    opacity 0.2s,
    transform 0.2s;
}
.ws-project-cover:hover .ws-project-open,
.ws-project-cover:focus-visible .ws-project-open {
  opacity: 1;
  transform: none;
}
.ws-project-info {
  padding: 17px 0 4px;
}
.ws-project-info > p:first-child {
  font: 9px var(--font-mono);
  color: #9e9e9e;
  margin-bottom: 9px;
}
.ws-project-info > button {
  display: flex;
  justify-content: space-between;
  width: 100%;
  gap: 12px;
  align-items: center;
  text-align: left;
  font-size: 17px;
  font-weight: 500;
  letter-spacing: -0.045em;
  color: #ececec;
  line-height: 1.4;
}
.ws-project-info > button .iconify {
  color: #909090;
  font-size: 16px;
  flex-shrink: 0;
}
.ws-project-info > button:hover {
  color: #e89abb;
}
.ws-project-description {
  font-size: 12px;
  line-height: 1.8;
  color: #a0a0a0;
  margin-top: 14px;
}
.ws-project-tech {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 13px;
  margin-top: 12px;
  font-size: 8px;
  color: #a4a4a4;
}
.ws-project-card :deep(.project-visual) {
  height: 220px;
  border-radius: 0;
  background: #212121;
}
.ws-project-card :deep(.visual-caption) {
  font-size: 6px;
  left: 15px;
  bottom: 14px;
  color: #b2b2b2;
  letter-spacing: 0.1em;
}
.ws-project-card :deep(.registration-art) {
  transform: scale(0.71) rotate(-8deg);
}
.ws-project-cover:hover :deep(.registration-art) {
  transform: scale(0.74) rotate(-3deg);
}
.ws-project-card :deep(.ticket-back) {
  background: #646464;
  border-color: #8d8d8d;
  color: #ebebeb;
}
.ws-project-card :deep(.ticket-front) {
  background: #e89abb;
  color: #2b2b2b;
  box-shadow: 0 22px 40px #0e0e0e50;
}
.ws-project-card :deep(.ticket-rule) {
  border-color: #959595;
}
.ws-project-card :deep(.ticket-front > strong) {
  color: #2b2b2b;
}
.ws-project-card :deep(.visual-services) {
  background: #1d1d1d;
}
.ws-project-card :deep(.service-core) {
  background: linear-gradient(140deg, #e89abb, #818181);
  color: #2b2b2b;
  box-shadow:
    0 8px 0 #3d3d3d,
    0 16px 30px #0e0e0e;
}
.ws-project-card :deep(.service-node) {
  background: #282828;
  border-color: #727272;
  color: #e89abb;
  box-shadow: 0 5px 0 #181818;
}
.ws-project-card :deep(.service-orbit) {
  border-color: #79797966;
}
.ws-project-card :deep(.services-art) {
  transform: scale(0.82);
}
.ws-project-card :deep(.visual-kanban) {
  background: #202020;
}
.ws-project-card :deep(.kanban-art) {
  transform: scale(0.83) rotate(-9deg) skewY(3deg);
}
.ws-project-card :deep(.kanban-column > .mono) {
  color: #bababa;
}
.ws-project-card :deep(.kanban-block) {
  background: #404040;
  border-color: #888888;
  color: #e89abb;
  box-shadow: 0 5px 0 #171717;
}
.ws-project-card :deep(.kanban-column:last-child .kanban-block) {
  background: #e89abb;
  color: #303030;
}
.ws-project-compact :deep(.project-visual) {
  height: 172px;
}
.ws-project-compact :deep(.registration-art) {
  transform: scale(0.53) rotate(-8deg);
}
.ws-project-compact .ws-project-cover:hover :deep(.registration-art) {
  transform: scale(0.56) rotate(-3deg);
}
.ws-project-compact :deep(.services-art) {
  transform: scale(0.62);
}
.ws-project-compact :deep(.kanban-art) {
  transform: scale(0.67) rotate(-9deg);
}
.ws-project-compact .ws-project-info > button {
  font-size: 14px;
}
.ws-project-compact .ws-project-info {
  padding-top: 14px;
}
@media (max-width: 767px) {
  .ws-project-compact :deep(.project-visual) {
    height: 200px;
  }
  .ws-project-compact :deep(.registration-art) {
    transform: scale(0.65) rotate(-8deg);
  }
  .ws-project-compact :deep(.services-art) {
    transform: scale(0.8);
  }
  .ws-project-compact :deep(.kanban-art) {
    transform: scale(0.85) rotate(-9deg);
  }
  .ws-project-compact .ws-project-info > button {
    font-size: 18px;
  }
  .ws-project-tech {
    font-size: 9px;
  }
}
</style>
