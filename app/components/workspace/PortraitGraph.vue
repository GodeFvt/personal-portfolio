<script setup lang="ts">
const selected = ref("build");
const nodes = [
  {
    id: "design",
    label: "Design the system",
    icon: "i-lucide-workflow",
    caption: "Clear boundaries. Connected services.",
  },
  {
    id: "build",
    label: "Build the backend",
    icon: "i-lucide-braces",
    caption: "Go, gRPC, and a little persistence.",
  },
  {
    id: "ship",
    label: "Ship & observe",
    icon: "i-lucide-container",
    caption: "Docker, deployment, and observability.",
  },
];
const current = computed(() =>
  nodes.find((node) => node.id === selected.value)!,
);
</script>

<template>
  <div class="portrait-graph">
    <div class="graph-paper" aria-hidden="true" />
    <svg class="graph-connectors" viewBox="0 0 420 350" aria-hidden="true">
      <path
        d="M75 85 H190 Q210 85 210 110 V160 M350 120 H280 Q260 120 260 140 V190 M125 285 H195 Q215 285 215 265 V220"
      />
    </svg>
    <div class="graph-portrait">
      <div class="graph-photo">
        <img
          src="/images/profile.jpg"
          alt="Got, Phuttinan Phaksaweng"
          width="572"
          height="702"
          fetchpriority="high"
        /><span class="photo-corner" aria-hidden="true">{ }</span>
      </div>
      <div class="graph-photo-caption">
        <strong>got<span>.dev</span></strong
        ><span class="mono">human, not a bot.</span>
      </div>
    </div>
    <button
      v-for="node in nodes"
      :key="node.id"
      class="graph-node"
      :class="`graph-node-${node.id}`"
      :aria-label="node.label"
      :aria-pressed="selected === node.id"
      @click="selected = node.id"
    >
      <UIcon :name="node.icon" /><span>{{ node.id }}</span>
    </button>
    <div class="graph-note" aria-live="polite">
      <span>{{ current.caption }}</span>
    </div>
  </div>
</template>

<style scoped>
.portrait-graph {
  position: relative;
  width: 100%;
  height: 360px;
  isolation: isolate;
}
.graph-paper {
  position: absolute;
  inset: 15px 0 40px;
  background-image: radial-gradient(#343434 1px, transparent 1px);
  background-size: 18px 18px;
  mask-image: radial-gradient(ellipse, #000 25%, transparent 70%);
  opacity: 0.7;
}
.graph-connectors {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  fill: none;
  stroke: #727272;
  stroke-width: 1;
  stroke-dasharray: 4 5;
}
.graph-portrait {
  position: absolute;
  width: 204px;
  top: 54px;
  left: 50%;
  margin-left: -102px;
  transform: rotate(-7deg);
  background: #1c1c1c;
  border: 1px solid #3c3c3c;
  padding: 9px 9px 0;
  border-radius: 9px;
  box-shadow: 12px 18px 0 #212121;
  transition: transform 0.45s;
}
.graph-portrait:hover {
  transform: rotate(-2deg) translateY(-4px);
}
.graph-photo {
  height: 209px;
  overflow: hidden;
  position: relative;
  border-radius: 4px;
  background: #acacac;
}
.graph-photo img {
  height: 100%;
  width: 100%;
  object-fit: cover;
  object-position: center 25%;
  filter: none;
  mix-blend-mode: normal;
}
.photo-corner {
  position: absolute;
  bottom: 8px;
  right: 11px;
  color: #e8e8e8;
  font: 34px var(--font-mono);
  letter-spacing: -8px;
}
.graph-photo-caption {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #ededed;
  padding: 0 3px;
}
.graph-photo-caption strong {
  font-size: 19px;
  letter-spacing: -1px;
}
.graph-photo-caption strong span {
  font-weight: 400;
}
.graph-photo-caption > .mono {
  font-size: 7px;
}
.graph-node {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 15px;
  background: #191919;
  border: 1px solid #373737;
  border-radius: 7px;
  box-shadow: 0 5px 0 #0d0d0d;
  color: #c4c4c4;
  transform: rotate(4deg);
  font: 10px var(--font-mono);
  transition:
    transform 0.25s,
    background 0.25s;
}
.graph-node .iconify {
  font-size: 21px;
}
.graph-node[aria-pressed="true"] {
  background: #e89abb;
  color: #262626;
  border-color: #e89abb;
}
.graph-node:hover {
  transform: rotate(0) translateY(-3px);
}
.graph-node-design {
  top: 33px;
  left: 2%;
}
.graph-node-build {
  top: 125px;
  right: -1%;
  transform: rotate(8deg);
}
.graph-node-ship {
  bottom: 50px;
  left: 2%;
  transform: rotate(-3deg);
}
.graph-note {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  font: 9px var(--font-mono);
  color: #afafaf;
  min-height: 27px;
}
@media (max-width: 1100px) {
  .graph-portrait {
    width: 178px;
    margin-left: -89px;
    top: 62px;
  }
  .graph-photo {
    height: 185px;
  }
  .graph-node {
    padding: 10px;
    font-size: 9px;
  }
  .graph-photo-caption > .mono {
    font-size: 6px;
  }
  .graph-node-build {
    right: 0;
  }
  .graph-node-design {
    left: 0;
  }
  .graph-node-ship {
    left: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
  }
}
</style>
