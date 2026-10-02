<script setup lang="ts">
import { pageBlockEditor, type PageBlockEditor } from "~/lib/page-blocks";
const blocks = defineModel<PageBlockEditor[]>({ required: true });
const types = [
  "TEXT",
  "IMAGE",
  "LINK_LIST",
  "PROJECT_GRID",
  "TIMELINE",
  "SKILL_GROUP",
] as const;
function move(index: number, direction: number) {
  const target = index + direction;
  if (target < 0 || target >= blocks.value.length) return;
  const [block] = blocks.value.splice(index, 1);
  if (block) blocks.value.splice(target, 0, block);
}
</script>
<template>
  <div class="admin-block-editor">
    <div class="admin-block-toolbar">
      <span>Page content</span>
      <div>
        <button
          v-for="type in types"
          :key="type"
          type="button"
          :disabled="blocks.length >= 60"
          @click="blocks.push(pageBlockEditor(type))"
        >
          + {{ type.toLowerCase().replaceAll("_", " ") }}
        </button>
      </div>
    </div>
    <article
      v-for="(block, index) in blocks"
      :key="index"
      class="admin-block-card"
    >
      <header>
        <strong>{{ index + 1 }} · {{ block.type }}</strong>
        <div>
          <button
            type="button"
            :disabled="index === 0"
            aria-label="Move block up"
            @click="move(index, -1)"
          >
            ↑</button
          ><button
            type="button"
            :disabled="index === blocks.length - 1"
            aria-label="Move block down"
            @click="move(index, 1)"
          >
            ↓</button
          ><button type="button" @click="blocks.splice(index, 1)">
            Remove
          </button>
        </div>
      </header>
      <template v-if="block.type === 'TEXT'">
        <label class="admin-field"
          ><span>Text style</span
          ><select v-model="block.variant">
            <option value="">Body</option>
            <option value="heading">Page heading</option>
            <option value="hero">Introduction hero</option>
            <option value="origin">Origin story</option>
            <option value="signoff">Contact signoff</option>
          </select></label
        >
        <div class="admin-field-row">
          <label class="admin-field"
            ><span>Kicker</span
            ><input v-model="block.kicker" maxlength="120" /></label
          ><label class="admin-field"
            ><span>Heading</span><input v-model="block.heading" maxlength="240"
          /></label>
        </div>
        <label class="admin-field"
          ><span>Text</span
          ><textarea v-model="block.content" rows="5" maxlength="10000" />
        </label>
        <label class="admin-field"
          ><span>Description</span
          ><textarea v-model="block.description" rows="3" maxlength="1000" />
        </label>
        <template v-if="block.variant === 'hero'">
          <div class="admin-field-row">
            <label class="admin-field"
              ><span>Full name</span><input v-model="block.fullName" /></label
            ><label class="admin-field"
              ><span>Role label</span><input v-model="block.roleLabel"
            /></label>
          </div>
          <div class="admin-field-row">
            <label class="admin-field"
              ><span>Primary button label</span
              ><input v-model="block.primaryLabel" /></label
            ><label class="admin-field"
              ><span>Primary destination tab slug</span
              ><input v-model="block.primarySlug" placeholder="projects"
            /></label>
          </div>
          <div class="admin-field-row">
            <label class="admin-field"
              ><span>Secondary button label</span
              ><input v-model="block.secondaryLabel" /></label
            ><label class="admin-field"
              ><span>Secondary destination tab slug</span
              ><input v-model="block.secondarySlug" placeholder="contact"
            /></label>
          </div>
        </template>
      </template>
      <template v-else-if="block.type === 'IMAGE'"
        ><AdminMediaPicker
          v-model="block.mediaId"
          kind="image"
          label="Page image"
          @selected="block.alt = $event.alt" /><label class="admin-field"
          ><span>Alternative text</span
          ><input v-model="block.alt" required maxlength="300" /></label
      ></template>
      <template v-else-if="block.type === 'LINK_LIST'"
        ><label class="admin-field"
          ><span>Heading</span><input v-model="block.heading" /></label
        ><label class="admin-field"
          ><span>Links — Label | URL | Description | Year (optional)</span
          ><textarea v-model="block.linksText" rows="5" /></label
      ></template>
      <template v-else>
        <label v-if="block.type === 'SKILL_GROUP'" class="admin-field"
          ><span>Display</span
          ><select v-model="block.variant">
            <option value="">Technology groups</option>
            <option value="focus-strip">Focus strip</option>
          </select></label
        >
        <label class="admin-field"
          ><span>Heading</span><input v-model="block.heading" maxlength="240"
        /></label>
        <label v-if="block.variant === 'focus-strip'" class="admin-field"
          ><span>Focus items — one per line</span
          ><textarea v-model="block.itemsText" rows="4" />
        </label>
        <template v-else
          ><div class="admin-field-row">
            <label class="admin-field"
              ><span>Kicker</span><input v-model="block.kicker" /></label
            ><label class="admin-field"
              ><span>Description</span><input v-model="block.description"
            /></label>
          </div>
          <p class="admin-muted">
            Uses the published
            {{
              block.type === "PROJECT_GRID"
                ? "Projects"
                : block.type === "TIMELINE"
                  ? "Experience"
                  : "Stack"
            }}
            records managed in Content.
          </p></template
        >
        <div v-if="block.type === 'PROJECT_GRID'" class="admin-toggle-row">
          <label
            ><input v-model="block.featuredOnly" type="checkbox" /> Featured
            only</label
          ><label
            ><input v-model="block.includeArchived" type="checkbox" /> Include
            archived</label
          >
        </div>
      </template>
    </article>
    <p v-if="!blocks.length" class="admin-muted">
      Add text, images, links, projects, experience, or stack. Custom pages
      display blocks in this order.
    </p>
  </div>
</template>
