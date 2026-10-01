import assert from "node:assert/strict";
import test from "node:test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { publishNavigationRevisions, VersionConflictError } from "../server/services/content-drafts";

const connectionString = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("TEST_DATABASE_URL is required.");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

test.after(async () => db.$disconnect());

test("fresh migrations and repeatable seed produce the complete baseline", async () => {
  const [groups, tabs, projects, roles, providers, profile] = await Promise.all([
    db.navigationGroup.count(),
    db.portfolioTab.count(),
    db.project.count(),
    db.role.count(),
    db.oAuthProvider.count(),
    db.profile.findFirst(),
  ]);
  assert.ok(groups >= 3);
  assert.ok(tabs >= 5);
  assert.ok(projects >= 1);
  assert.ok(roles >= 3);
  assert.equal(providers, 3);
  assert.ok(profile?.portraitMediaId);
  assert.ok(profile?.resumeMediaId);
});

test("publication is atomic when a later revision is invalid", async () => {
  const group = await db.navigationGroup.findFirstOrThrow({ orderBy: { sortOrder: "asc" } });
  const actor = await db.adminUser.findFirstOrThrow({ where: { status: "ACTIVE" } });
  const nextVersion = group.version + 1;
  await db.contentRevision.create({
    data: {
      entityType: "NavigationGroup",
      entityId: group.id,
      version: nextVersion,
      snapshot: { label: `${group.label} verified`, sortOrder: group.sortOrder, visibility: group.visibility },
    },
  });

  await assert.rejects(
    db.$transaction(
      (transaction) => publishNavigationRevisions(transaction, [
        { entityType: "NavigationGroup", entityId: group.id, version: nextVersion },
        { entityType: "NavigationGroup", entityId: crypto.randomUUID(), version: 1 },
      ], actor.id),
      { isolationLevel: "Serializable" },
    ),
    VersionConflictError,
  );
  const unchanged = await db.navigationGroup.findUniqueOrThrow({ where: { id: group.id } });
  assert.equal(unchanged.version, group.version);
  assert.equal(unchanged.label, group.label);
});

test("optimistic version conflicts do not overwrite a concurrent change", async () => {
  const group = await db.navigationGroup.findFirstOrThrow({ orderBy: { sortOrder: "desc" } });
  const actor = await db.adminUser.findFirstOrThrow({ where: { status: "ACTIVE" } });
  const revisionVersion = group.version + 1;
  await db.contentRevision.create({
    data: {
      entityType: "NavigationGroup",
      entityId: group.id,
      version: revisionVersion,
      snapshot: { label: "stale write", sortOrder: group.sortOrder, visibility: group.visibility },
    },
  });
  await db.navigationGroup.update({ where: { id: group.id }, data: { version: { increment: 1 } } });
  await assert.rejects(
    db.$transaction(
      (transaction) => publishNavigationRevisions(transaction, [
        { entityType: "NavigationGroup", entityId: group.id, version: revisionVersion },
      ], actor.id),
      { isolationLevel: "Serializable" },
    ),
    /changed after this draft/i,
  );
  const current = await db.navigationGroup.findUniqueOrThrow({ where: { id: group.id } });
  assert.notEqual(current.label, "stale write");
});

test("concurrent last-owner removals cannot both commit", async () => {
  const ownerRole = await db.role.findUniqueOrThrow({ where: { key: "owner" } });
  const owner = await db.adminUser.findFirstOrThrow({ where: { roles: { some: { roleId: ownerRole.id } } } });
  const remaining = await db.adminUser.count({ where: { status: "ACTIVE", roles: { some: { roleId: ownerRole.id } } } });
  assert.equal(remaining, 1);
  assert.equal(owner.status, "ACTIVE");
});
