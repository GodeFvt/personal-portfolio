import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "../generated/prisma/client";
import type { PermissionKey } from "../shared/auth/permissions";
import {
  assertDelegablePermissions,
  assertOwnerChangeAllowed,
  loadAssignableRoles,
  serializable,
} from "../server/services/access-control";

test("delegation accepts a subset of the actor's permissions", () => {
  const actor = new Set<PermissionKey>(["admin.access", "content.read", "roles.assign"]);
  assert.doesNotThrow(() => assertDelegablePermissions(actor, ["admin.access", "content.read"]));
});

test("delegation rejects permissions the actor does not hold", () => {
  const actor = new Set<PermissionKey>(["admin.access", "roles.assign"]);
  assert.throws(
    () => assertDelegablePermissions(actor, ["ownership.manage"]),
    /cannot grant permissions/i,
  );
});

test("Owner role cannot be assigned without ownership.manage", async () => {
  const transaction = {
    role: {
      findMany: async () => [{
        id: "00000000-0000-4000-8000-000000000001",
        key: "owner",
        permissions: [],
      }],
    },
  } as unknown as Prisma.TransactionClient;
  await assert.rejects(
    loadAssignableRoles(
      transaction,
      ["00000000-0000-4000-8000-000000000001"],
      new Set<PermissionKey>(["roles.assign"]),
    ),
    /Owner assignment is protected/i,
  );
});

test("the last active Owner cannot be suspended or stripped of Owner", async () => {
  const transaction = {
    adminUser: { findFirst: async () => null },
  } as unknown as Prisma.TransactionClient;
  await assert.rejects(
    assertOwnerChangeAllowed(transaction, {
      targetUserId: "00000000-0000-4000-8000-000000000001",
      targetIsActiveOwner: true,
      nextIsActiveOwner: false,
    }),
    /last active Owner/i,
  );
});

test("Owner removal proceeds when another active Owner exists", async () => {
  const transaction = {
    adminUser: { findFirst: async () => ({ id: "00000000-0000-4000-8000-000000000002" }) },
  } as unknown as Prisma.TransactionClient;
  await assert.doesNotReject(
    assertOwnerChangeAllowed(transaction, {
      targetUserId: "00000000-0000-4000-8000-000000000001",
      targetIsActiveOwner: true,
      nextIsActiveOwner: false,
    }),
  );
});

test("serializable access mutations retry concurrent write conflicts", async () => {
  let attempts = 0;
  const database = {
    async $transaction<T>(work: (transaction: Prisma.TransactionClient) => Promise<T>) {
      attempts += 1;
      if (attempts < 3) throw Object.assign(new Error("write conflict"), { code: "P2034" });
      return work({} as Prisma.TransactionClient);
    },
  };
  const result = await serializable(async () => "saved", database);
  assert.equal(result, "saved");
  assert.equal(attempts, 3);
});
