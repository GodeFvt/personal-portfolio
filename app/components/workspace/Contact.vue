<script setup lang="ts">
import type { PortfolioWorkspaceView } from "~/types/portfolio";
import { linkIcon } from "~/lib/portfolio/links";

defineProps<
  Pick<
    PortfolioWorkspaceView,
    | "pageHeading"
    | "profile"
    | "linkListContent"
    | "contactSocialLinks"
    | "contactSignoff"
    | "copy"
  >
>();
</script>

<template>
  <div class="ws-contact-preview">
    <div class="ws-view-heading">
      <span class="ws-kicker">{{ pageHeading.kicker }}</span>
      <h1>{{ pageHeading.heading }}</h1>
      <p>{{ pageHeading.description }}</p>
    </div>
    <div class="ws-contact-card">
      <div class="ws-contact-postmark" aria-hidden="true">
        <UIcon name="i-lucide-at-sign" />
      </div>
      <span class="mono"
        >TO: {{ (profile.alias || profile.name).toUpperCase() }}</span
      ><a :href="`mailto:${profile.email}`"
        >{{ profile.email }}<UIcon name="i-lucide-arrow-up-right"
      /></a>
      <div class="ws-contact-card-bottom">
        <span>{{ linkListContent.heading }}</span
        ><button @click="copy(profile.email, 'Email')">
          <UIcon name="i-lucide-copy" />Copy email
        </button>
      </div>
    </div>
    <div class="ws-contact-links">
      <a
        v-for="link in contactSocialLinks"
        :key="link.url"
        :href="link.url"
        target="_blank"
        rel="noopener noreferrer"
        ><UIcon :name="linkIcon(link.url)" /><span
          >{{ link.label }}<small>{{ link.description }}</small></span
        ><UIcon name="i-lucide-arrow-up-right"
      /></a>
    </div>
    <div class="ws-contact-signoff">
      <img
        v-if="profile.portrait"
        :src="profile.portrait"
        alt=""
        width="48"
        height="48"
      />
      <p>{{ contactSignoff }}</p>
    </div>
  </div>
</template>
