import assert from "node:assert/strict";
import test from "node:test";
import { authorizationRequest } from "../server/services/oauth-adapters";
import { claimOAuthAttempt } from "../server/services/oauth-attempts";
import { assertInvitationIdentity } from "../shared/auth/oauth-invitations";
import type { Prisma } from "../generated/prisma/client";

const base = {
  redirectUri: "https://example.com/api/auth/oauth/provider/callback",
  state: "state-token",
  nonce: "nonce-token",
  codeChallenge: "pkce-challenge",
};

test("Google authorization uses code flow, PKCE, state, nonce, and minimal identity scopes", () => {
  const request = authorizationRequest({ ...base, config: { type: "google", clientId: "google-client", clientSecret: "", options: { type: "google" } } });
  assert.equal(request.url, "https://accounts.google.com/o/oauth2/v2/auth");
  assert.equal(request.params.response_type, "code");
  assert.equal(request.params.code_challenge_method, "S256");
  assert.equal(request.params.state, base.state);
  assert.equal(request.params.nonce, base.nonce);
  assert.equal(request.params.scope, "openid email profile");
});

test("Microsoft account policy selects the constrained authorization tenant", () => {
  const single = authorizationRequest({ ...base, config: { type: "microsoft", clientId: "ms-client", clientSecret: "", options: { type: "microsoft", tenant: "tenant.example", accountPolicy: "single-tenant" } } });
  const organizations = authorizationRequest({ ...base, config: { type: "microsoft", clientId: "ms-client", clientSecret: "", options: { type: "microsoft", tenant: "ignored.example", accountPolicy: "organizations" } } });
  assert.match(single.url, /tenant\.example/);
  assert.match(organizations.url, /\/organizations\//);
  assert.equal(single.params.nonce, base.nonce);
});

test("GitHub authorization requires PKCE and verified-email scope when configured", () => {
  const request = authorizationRequest({ ...base, config: { type: "github", clientId: "gh-client", clientSecret: "", options: { type: "github", emailRequired: true } } });
  assert.equal(request.url, "https://github.com/login/oauth/authorize");
  assert.equal(request.params.code_challenge, base.codeChallenge);
  assert.match(request.params.scope, /user:email/);
  assert.equal(request.params.allow_signup, "false");
});

test("OAuth attempts are single-use and reject replay", async () => {
  let consumedAt: Date | null = null;
  const attempt = {
    id: "attempt-1",
    stateHash: "state-hash",
    consumedAt,
    expiresAt: new Date("2030-01-01T00:00:00Z"),
    provider: { id: "provider-1", key: "google" },
  };
  const transaction = {
    oAuthAttempt: {
      findUnique: async () => ({ ...attempt, consumedAt }),
      updateMany: async () => {
        if (consumedAt) return { count: 0 };
        consumedAt = new Date("2029-01-01T00:00:00Z");
        return { count: 1 };
      },
    },
  } as unknown as Prisma.TransactionClient;
  await claimOAuthAttempt(transaction, "state-hash", new Date("2029-01-01T00:00:00Z"));
  await assert.rejects(
    claimOAuthAttempt(transaction, "state-hash", new Date("2029-01-01T00:00:01Z")),
    /invalid or expired|already used/i,
  );
});

test("OAuth invitation accepts only the exact verified invited email", () => {
  assert.doesNotThrow(() => assertInvitationIdentity("Invited.User@example.com", {
    email: "invited.user@EXAMPLE.com",
    emailVerified: true,
  }));
});

test("OAuth invitation rejects an unverified provider email", () => {
  assert.throws(() => assertInvitationIdentity("invited@example.com", {
    email: "invited@example.com",
    emailVerified: false,
  }), /verified email/i);
});

test("OAuth invitation rejects a different provider account", () => {
  assert.throws(() => assertInvitationIdentity("invited@example.com", {
    email: "someone-else@example.com",
    emailVerified: true,
  }), /matches the invitation email/i);
});
