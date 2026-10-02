import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "../generated/prisma/client";
import {
  savePageContent,
  deletePortfolioTab,
} from "../server/services/page-content";
import { saveNavigationDraft } from "../server/services/content-drafts";
const id = "00000000-0000-4000-8000-000000000010";
const groupId = "00000000-0000-4000-8000-000000000020";
function database(options: { version?: number; defaultCount?: number } = {}) {
  const base = {
    id,
    groupId,
    slug: "test",
    label: "Test",
    description: "",
    icon: "i-lucide-file-text",
    template: "CUSTOM_PAGE",
    sortOrder: 3,
    publicationState: "PUBLISHED",
    version: options.version ?? 1,
    blocks: [{ type: "TEXT", props: { type: "text", content: "Published" } }],
  };
  const pending = {
    snapshot: {
      ...base,
      label: "Renamed draft",
      blocks: [
        { type: "TEXT", props: { type: "text", content: "Private draft" } },
      ],
    },
    publishedAt: null,
  };
  const calls: Array<{ kind: string; value?: unknown }> = [];
  const tx = {
    portfolioTab: {
      findUnique: async () => base,
      findFirst: async () => null,
      delete: async () => {
        calls.push({ kind: "delete" });
      },
    },
    tabSlugAlias: { findFirst: async () => null },
    siteSettings: { count: async () => options.defaultCount ?? 0 },
    contentRevision: {
      findUnique: async () => pending,
      upsert: async (value: { create: unknown }) => {
        calls.push({ kind: "save", value: value.create });
        return value.create;
      },
      deleteMany: async () => {
        calls.push({ kind: "revisions.delete" });
      },
    },
    auditLog: {
      create: async (value: unknown) => {
        calls.push({ kind: "audit", value });
      },
    },
  };
  const db = {
    $transaction: async (callback: (value: typeof tx) => unknown) =>
      callback(tx),
  } as unknown as PrismaClient;
  return { base, pending, calls, db };
}
test("page draft saves preserve pending navigation metadata and published content", async () => {
  const { db, calls, base } = database();
  await savePageContent(
    id,
    {
      expectedVersion: 1,
      template: "CUSTOM_PAGE",
      blocks: [
        { type: "TEXT", props: { type: "text", content: "Edited content" } },
      ],
    },
    "actor",
    undefined,
    db,
  );
  const saved = calls.find((call) => call.kind === "save")?.value as {
    snapshot: { label: string; blocks: Array<{ props: { content: string } }> };
  };
  assert.equal(saved.snapshot.label, "Renamed draft");
  assert.equal(saved.snapshot.blocks[0]?.props.content, "Edited content");
  assert.equal(base.blocks[0]?.props.content, "Published");
});
test("navigation saves preserve the latest page content instead of accepting incoming blocks", async () => {
  const { db, calls, base } = database();
  await saveNavigationDraft(
    {
      entityType: "PortfolioTab",
      entityId: id,
      expectedVersion: 1,
      snapshot: {
        ...base,
        template: "CUSTOM_PAGE",
        publicationState: "PUBLISHED",
        label: "New label",
        blocks: [],
      },
    },
    "actor",
    undefined,
    db,
  );
  const saved = calls.find((call) => call.kind === "save")?.value as {
    snapshot: { label: string; blocks: Array<{ props: { content: string } }> };
  };
  assert.equal(saved.snapshot.label, "New label");
  assert.equal(saved.snapshot.blocks[0]?.props.content, "Private draft");
});
test("stale page saves and deletion fail without writes", async () => {
  const { db, calls } = database({ version: 2 });
  await assert.rejects(
    savePageContent(
      id,
      { expectedVersion: 1, template: "CUSTOM_PAGE", blocks: [] },
      "actor",
      undefined,
      db,
    ),
    /changed/,
  );
  await assert.rejects(
    deletePortfolioTab(id, 1, "actor", undefined, db),
    /changed/,
  );
  assert.equal(calls.length, 0);
});
test("default tab deletion is blocked before revisions or records are deleted", async () => {
  const { db, calls } = database({ defaultCount: 1 });
  await assert.rejects(
    deletePortfolioTab(id, 1, "actor", undefined, db),
    /default tab/,
  );
  assert.equal(calls.length, 0);
});
test("tab deletion removes revisions and the tab and writes an audit record", async () => {
  const { db, calls } = database();
  assert.deepEqual(await deletePortfolioTab(id, 1, "actor", undefined, db), {
    deleted: true,
  });
  assert.deepEqual(
    calls.map((call) => call.kind),
    ["revisions.delete", "delete", "audit"],
  );
});
