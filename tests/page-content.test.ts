import assert from "node:assert/strict";
import test from "node:test";
import {
  adminPageBlockSchema,
  savePageContentSchema,
} from "../shared/schemas/admin-content";
import { pageBlockEditor, serializePageBlock } from "../app/lib/page-blocks";

test("page editor round trips main-page hero, focus and archive metadata", () => {
  const blocks = [
    {
      type: "TEXT",
      props: {
        type: "text",
        variant: "hero",
        kicker: "Hello",
        heading: "Developer",
        fullName: "Owner",
        roleLabel: "Backend",
        description: "Builds things",
        primaryAction: { label: "Work", tabSlug: "projects" },
      },
    },
    {
      type: "SKILL_GROUP",
      props: {
        type: "skill-group",
        variant: "focus-strip",
        heading: "Focus",
        items: ["Systems", "APIs"],
      },
    },
    {
      type: "LINK_LIST",
      props: {
        type: "link-list",
        heading: "Archive",
        links: [
          {
            label: "Project",
            url: "/projects",
            description: "Example",
            year: "2024",
          },
        ],
      },
    },
  ];
  for (const source of blocks) {
    const parsed = adminPageBlockSchema.parse(source);
    const result = serializePageBlock(
      pageBlockEditor(parsed.type, parsed.props),
    );
    for (const [key, value] of Object.entries(source.props))
      assert.deepEqual(result.props[key as keyof typeof result.props], value);
  }
});

test("page content rejects mismatched blocks and executable link protocols", () => {
  assert.equal(
    adminPageBlockSchema.safeParse({
      type: "IMAGE",
      props: { type: "text", content: "hello" },
    }).success,
    false,
  );
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,hello",
    "//external.test/",
  ]) {
    assert.equal(
      adminPageBlockSchema.safeParse({
        type: "LINK_LIST",
        props: { type: "link-list", links: [{ label: "Unsafe", url }] },
      }).success,
      false,
    );
  }
});

test("new custom pages accept all content block types in a chosen order", () => {
  const blocks = [
    {
      type: "TEXT",
      props: { type: "text", variant: "heading", heading: "Custom work" },
    },
    {
      type: "IMAGE",
      props: {
        type: "image",
        mediaId: "00000000-0000-4000-8000-000000000001",
        alt: "Example",
      },
    },
    {
      type: "LINK_LIST",
      props: {
        type: "link-list",
        links: [{ label: "Email", url: "mailto:owner@example.com" }],
      },
    },
    {
      type: "PROJECT_GRID",
      props: { type: "project-grid", featuredOnly: true },
    },
    { type: "TIMELINE", props: { type: "timeline" } },
    { type: "SKILL_GROUP", props: { type: "skill-group" } },
  ];
  const result = savePageContentSchema.parse({
    expectedVersion: 0,
    template: "CUSTOM_PAGE",
    blocks,
  });
  assert.deepEqual(
    result.blocks.map((block) => block.type),
    blocks.map((block) => block.type),
  );
});
