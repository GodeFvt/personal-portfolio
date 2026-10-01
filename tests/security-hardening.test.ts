import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import type { Prisma } from "../generated/prisma/client";
import { claimOAuthAttempt } from "../server/services/oauth-attempts";
import { issueMediaUploadToken, safeOriginalName, verifyMediaUploadToken } from "../server/services/media-security";
import { decryptSecret, encryptSecret } from "../server/utils/secret-encryption";
import { resetServerEnvForTests } from "../server/utils/env";
import { assertInvitationIdentity } from "../shared/auth/oauth-invitations";

const originalKeys = process.env.OAUTH_SECRET_KEYS;
const originalActiveKey = process.env.OAUTH_ACTIVE_KEY_VERSION;
process.env.DATABASE_URL ||= "postgresql://portfolio:portfolio@localhost:5432/portfolio";
process.env.NUXT_SESSION_PASSWORD = "phase-five-test-session-secret-32-characters";

test.after(() => {
  if (originalKeys === undefined) delete process.env.OAUTH_SECRET_KEYS;
  else process.env.OAUTH_SECRET_KEYS = originalKeys;
  if (originalActiveKey === undefined) delete process.env.OAUTH_ACTIVE_KEY_VERSION;
  else process.env.OAUTH_ACTIVE_KEY_VERSION = originalActiveKey;
  resetServerEnvForTests();
});

test("OAuth state claims reject expiry without consuming the attempt", async () => {
  let writes = 0;
  const transaction = {
    oAuthAttempt: {
      findUnique: async () => ({
        id: "expired",
        consumedAt: null,
        expiresAt: new Date("2025-01-01T00:00:00Z"),
        provider: { id: "provider", key: "google" },
      }),
      updateMany: async () => { writes += 1; return { count: 1 }; },
    },
  } as unknown as Prisma.TransactionClient;
  await assert.rejects(
    claimOAuthAttempt(transaction, "expired-state", new Date("2025-01-01T00:00:01Z")),
    /invalid or expired/i,
  );
  assert.equal(writes, 0);
});

test("invitation identity never grants access for missing, unverified, or different email", () => {
  for (const identity of [
    { email: null, emailVerified: false },
    { email: "owner@example.com", emailVerified: false },
    { email: "other@example.com", emailVerified: true },
  ]) {
    assert.throws(() => assertInvitationIdentity("owner@example.com", identity), /verified email|matches/i);
  }
});

test("OAuth secret rotation decrypts old envelopes without exposing plaintext", () => {
  const key1 = Buffer.alloc(32, 1).toString("base64");
  const key2 = Buffer.alloc(32, 2).toString("base64");
  process.env.OAUTH_SECRET_KEYS = `1:${key1},2:${key2}`;
  process.env.OAUTH_ACTIVE_KEY_VERSION = "1";
  resetServerEnvForTests();
  const oldEnvelope = encryptSecret("old-provider-secret");
  assert.equal(oldEnvelope.keyVersion, 1);
  assert.doesNotMatch(oldEnvelope.ciphertext, /old-provider-secret/);

  process.env.OAUTH_ACTIVE_KEY_VERSION = "2";
  resetServerEnvForTests();
  const newEnvelope = encryptSecret("new-provider-secret");
  assert.equal(newEnvelope.keyVersion, 2);
  assert.equal(decryptSecret(oldEnvelope.ciphertext), "old-provider-secret");
  assert.equal(decryptSecret(newEnvelope.ciphertext), "new-provider-secret");
});

test("expired upload grants and unsafe file names are rejected", () => {
  resetServerEnvForTests();
  const grant = { assetId: crypto.randomUUID(), sessionId: crypto.randomUUID(), userId: crypto.randomUUID() };
  const token = issueMediaUploadToken(grant);
  assert.ok(verifyMediaUploadToken(token, grant));

  const payload = Buffer.from(JSON.stringify({ ...grant, expiresAt: Date.now() - 1 })).toString("base64url");
  const signature = createHmac("sha256", process.env.NUXT_SESSION_PASSWORD!).update(payload).digest("base64url");
  assert.equal(verifyMediaUploadToken(`${payload}.${signature}`, grant), null);
  assert.equal(safeOriginalName("../unsafe\\name\0.png"), ".._unsafe_name_.png");
});
