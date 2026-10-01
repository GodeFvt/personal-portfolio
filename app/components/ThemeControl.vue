<script setup lang="ts">
const colorMode = useColorMode();

const modes = [
  { value: "light", label: "Light", icon: "i-lucide-sun" },
  { value: "dark", label: "Dark", icon: "i-lucide-moon" },
] as const;
</script>

<template>
  <div class="theme-control" role="group" aria-label="Color theme">
    <button
      v-for="mode in modes"
      :key="mode.value"
      type="button"
      :aria-label="`Use ${mode.label.toLowerCase()} theme`"
      :aria-pressed="colorMode.value === mode.value"
      :title="mode.label"
      @click="colorMode.preference = mode.value"
    >
      <UIcon :name="mode.icon" />
      <span>{{ mode.label }}</span>
    </button>
  </div>
</template>
