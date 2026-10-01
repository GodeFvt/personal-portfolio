<script setup lang="ts">
const props = defineProps<{
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: "danger" | "default";
}>();

const emit = defineEmits<{ confirm: []; cancel: [] }>();
const panel = ref<HTMLElement>();
const cancelButton = ref<HTMLButtonElement>();
let previousFocus: HTMLElement | null = null;

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    event.preventDefault();
    emit("cancel");
    return;
  }
  if (event.key !== "Tab" || !panel.value) return;
  const focusable = [...panel.value.querySelectorAll<HTMLElement>("button:not([disabled])")];
  if (!focusable.length) return;
  const first = focusable[0]!;
  const last = focusable.at(-1)!;
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

watch(() => props.open, async (open) => {
  if (open) {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    await nextTick();
    cancelButton.value?.focus();
  } else {
    previousFocus?.focus();
    previousFocus = null;
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition name="admin-modal">
      <div v-if="open" class="admin-modal-backdrop" @click.self="emit('cancel')">
        <section ref="panel" class="admin-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="admin-confirm-title" aria-describedby="admin-confirm-description" @keydown="handleKeydown">
          <div class="admin-confirm-icon" :class="{ 'is-danger': tone === 'danger' }"><UIcon :name="tone === 'danger' ? 'i-lucide-triangle-alert' : 'i-lucide-circle-help'" /></div>
          <div class="admin-confirm-copy"><p class="admin-eyebrow">Confirmation required</p><h2 id="admin-confirm-title">{{ title }}</h2><p id="admin-confirm-description">{{ description }}</p></div>
          <div class="admin-confirm-actions"><button ref="cancelButton" class="admin-secondary-button" type="button" @click="emit('cancel')">{{ cancelLabel }}</button><button :class="tone === 'danger' ? 'admin-danger-button' : 'admin-primary-button'" type="button" @click="emit('confirm')">{{ confirmLabel }}</button></div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
