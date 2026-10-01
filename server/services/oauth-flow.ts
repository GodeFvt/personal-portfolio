import { createHash, randomBytes } from "node:crypto";
import type { H3Event } from "h3";
import { createError, getQuery, sendRedirect } from "h3";
import type { OAuthAttemptIntent, Prisma } from "../../generated/prisma/client";
import { oauthStartSchema } from "../../shared/schemas/admin-security";
import { apiData, apiError } from "../utils/api-response";
import { assertSameOrigin, requireAdmin, requireCsrf, requireFreshAuthentication, sessionExpiry } from "../utils/admin-auth";
import { useDatabase } from "../utils/db";
import { getServerEnv } from "../utils/env";
import { decryptSecret } from "../utils/secret-encryption";
import { authorizationRequest, completeAuthorization } from "./oauth-adapters";
import { serializable } from "./access-control";
import { claimOAuthAttempt } from "./oauth-attempts";
import { acceptOAuthInvitation, loadOpenInvitation } from "./oauth-invitations";

const ATTEMPT_LIFETIME_MS = 10 * 60 * 1000;

function hash(value: string) {
  return createHash("sha256").update(value).digest("base64url");
}

function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

function redirectUri(providerKey: string) {
  return `${getServerEnv().NUXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/api/auth/oauth/${encodeURIComponent(providerKey)}/callback`;
}

function resultPath(intent: OAuthAttemptIntent, result: string, providerKey: string) {
  const base = intent === "LOGIN"
    ? "/admin/login"
    : intent === "INVITE"
      ? "/admin/accept-invitation"
      : intent === "TEST"
        ? "/admin/security/login-methods"
        : "/admin/account/login-methods";
  return `${base}?oauth=${encodeURIComponent(result)}&provider=${encodeURIComponent(providerKey)}`;
}

async function loadConfig(providerKey: string, intent: OAuthAttemptIntent) {
  const db = useDatabase();
  const provider = await db.oAuthProvider.findUnique({ where: { key: providerKey } });
  if (!provider) throw createError({ statusCode: 404, statusMessage: "OAuth provider not found." });
  const configVersion = intent === "TEST" ? provider.draftConfigVersion : provider.activeConfigVersion;
  if (intent !== "TEST" && (!provider.enabled || !configVersion)) throw createError({ statusCode: 404, statusMessage: "OAuth provider is unavailable." });
  if (!configVersion) throw createError({ statusCode: 409, statusMessage: "Save a provider draft before testing." });
  const config = await db.oAuthProviderConfig.findUnique({ where: { providerId_configVersion: { providerId: provider.id, configVersion } } });
  if (!config) throw createError({ statusCode: 409, statusMessage: "OAuth provider configuration is unavailable." });
  return { provider, config };
}

export async function startOAuth(event: H3Event, providerKey: string) {
  setHeader(event, "cache-control", "no-store");
  const parsed = oauthStartSchema.safeParse(await readBody(event));
  if (!parsed.success) return apiError(event, 400, { code: "VALIDATION_ERROR", message: "Invalid OAuth intent." });
  const intent = parsed.data.intent;
  let admin: Awaited<ReturnType<typeof requireAdmin>> | null = null;
  let invitation: Awaited<ReturnType<typeof loadOpenInvitation>> | null = null;
  try {
    if (intent === "LOGIN" || intent === "INVITE") {
      assertSameOrigin(event);
      if (intent === "INVITE") invitation = await loadOpenInvitation(parsed.data.invitationToken!);
    }
    else {
      await requireCsrf(event);
      admin = await requireAdmin(event);
      if (intent === "TEST") {
        if (!admin.permissions.has("auth.providers.manage")) throw createError({ statusCode: 403 });
        requireFreshAuthentication(admin);
      }
    }
    const { provider, config } = await loadConfig(providerKey, intent);
    const state = randomToken();
    const nonce = randomToken();
    const codeVerifier = randomToken(48);
    const request = authorizationRequest({
      config: { type: provider.type, clientId: config.clientId, clientSecret: "", options: config.validatedConfig },
      redirectUri: redirectUri(provider.key),
      state,
      nonce,
      codeChallenge: hash(codeVerifier),
    });
    await useDatabase().$transaction([
      useDatabase().oAuthAttempt.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - ATTEMPT_LIFETIME_MS) } } }),
      useDatabase().oAuthAttempt.create({ data: {
        stateHash: hash(state),
        nonceHash: hash(nonce),
        pkceVerifier: codeVerifier,
        intent,
        providerId: provider.id,
        configVersion: config.configVersion,
        initiatingUserId: admin?.user.id,
        initiatingSessionId: admin?.session.id,
        invitationId: invitation?.id,
        expiresAt: new Date(Date.now() + ATTEMPT_LIFETIME_MS),
      } }),
    ]);
    const url = new URL(request.url);
    for (const [key, value] of Object.entries(request.params)) url.searchParams.set(key, value);
    return apiData({ authorizationUrl: url.toString() });
  } catch (error) {
    const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 500;
    if ([401, 403, 404, 409, 410].includes(status)) return apiError(event, status, { code: status === 401 ? "AUTH_REQUIRED" : status === 403 ? "REQUEST_REJECTED" : status === 404 ? "PROVIDER_UNAVAILABLE" : status === 410 ? "INVITATION_EXPIRED" : "PROVIDER_NOT_READY", message: error instanceof Error ? error.message : "OAuth could not be started." });
    throw error;
  }
}

async function consumeAttempt(state: string) {
  const db = useDatabase();
  return db.$transaction(async (transaction) => {
    return claimOAuthAttempt(transaction, hash(state));
  }, { isolationLevel: "Serializable" });
}

async function assertInitiator(event: H3Event, attempt: { initiatingUserId: string | null; initiatingSessionId: string | null }) {
  const admin = await requireAdmin(event);
  if (!attempt.initiatingUserId || !attempt.initiatingSessionId || admin.user.id !== attempt.initiatingUserId || admin.session.id !== attempt.initiatingSessionId) {
    throw createError({ statusCode: 401, statusMessage: "OAuth initiator session changed." });
  }
  return admin;
}

async function installProviderSession(event: H3Event, input: { session: { id: string }; user: { id: string; email: string; sessionVersion: number }; authenticatedAt: Date }) {
  const { session, user, authenticatedAt } = input;
  await replaceUserSession(event, { user: { id: user.id, email: user.email }, secure: { sessionId: session.id, sessionVersion: user.sessionVersion }, csrfToken: randomToken(), loggedInAt: authenticatedAt.getTime() });
}

export async function finishOAuth(event: H3Event, providerKey: string) {
  setHeader(event, "cache-control", "no-store");
  const query = getQuery(event);
  const state = typeof query.state === "string" ? query.state : "";
  if (!state) return sendRedirect(event, `/admin/login?oauth=invalid`);
  let attempt: Awaited<ReturnType<typeof consumeAttempt>>;
  try { attempt = await consumeAttempt(state); }
  catch { return sendRedirect(event, `/admin/login?oauth=invalid`); }
  if (attempt.provider.key !== providerKey) return sendRedirect(event, resultPath(attempt.intent, "invalid", providerKey));
  if (query.error || typeof query.code !== "string") return sendRedirect(event, resultPath(attempt.intent, "cancelled", providerKey));

  try {
    const provider = await useDatabase().oAuthProvider.findUnique({ where: { id: attempt.providerId } });
    if (!provider) throw createError({ statusCode: 404 });
    if (attempt.intent === "TEST") {
      if (provider.draftConfigVersion !== attempt.configVersion) throw createError({ statusCode: 409 });
    } else if (!provider.enabled || provider.activeConfigVersion !== attempt.configVersion) {
      throw createError({ statusCode: 409 });
    }
    const config = await useDatabase().oAuthProviderConfig.findUnique({ where: { providerId_configVersion: { providerId: provider.id, configVersion: attempt.configVersion } } });
    if (!config || !attempt.pkceVerifier) throw createError({ statusCode: 409 });
    const identity = await completeAuthorization({
      config: { type: provider.type, clientId: config.clientId, clientSecret: decryptSecret(config.encryptedSecret), options: config.validatedConfig },
      redirectUri: redirectUri(provider.key), code: query.code, codeVerifier: attempt.pkceVerifier, nonceHash: attempt.nonceHash,
    });

    if (attempt.intent === "TEST") {
      const admin = await assertInitiator(event, attempt);
      await useDatabase().$transaction([
        useDatabase().oAuthProviderConfig.update({ where: { id: config.id }, data: { testedAt: new Date(), testedById: admin.user.id } }),
        useDatabase().auditLog.create({ data: { actorId: admin.user.id, action: "oauth.config.tested", entityType: "OAuthProvider", entityId: provider.id, metadata: { configVersion: config.configVersion, requestId: event.context.requestId } } }),
      ]);
      return sendRedirect(event, resultPath(attempt.intent, "tested", provider.key));
    }

    if (attempt.intent === "INVITE") {
      if (!attempt.invitationId) throw createError({ statusCode: 409, statusMessage: "Invitation context is missing." });
      const authenticatedAt = new Date();
      const login = await serializable((transaction) => acceptOAuthInvitation(transaction, {
        invitationId: attempt.invitationId!,
        providerId: provider.id,
        providerKey: provider.key,
        identity,
        authenticatedAt,
        requestId: event.context.requestId,
      }), useDatabase());
      await installProviderSession(event, login);
      return sendRedirect(event, "/admin");
    }

    if (attempt.intent === "LINK") {
      const admin = await assertInitiator(event, attempt);
      const existing = await useDatabase().oAuthIdentity.findUnique({ where: { providerId_issuer_subject: { providerId: provider.id, issuer: identity.issuer, subject: identity.subject } } });
      if (existing && existing.userId !== admin.user.id) throw createError({ statusCode: 409, statusMessage: "Identity already linked." });
      const linkedIdentity = existing
        ? await useDatabase().oAuthIdentity.update({ where: { id: existing.id }, data: { displayEmail: identity.email } })
        : await useDatabase().oAuthIdentity.create({ data: { userId: admin.user.id, providerId: provider.id, issuer: identity.issuer, subject: identity.subject, displayEmail: identity.email } });
      await useDatabase().auditLog.create({ data: { actorId: admin.user.id, action: "oauth.identity.linked", entityType: "OAuthIdentity", entityId: linkedIdentity.id, metadata: { providerKey: provider.key, requestId: event.context.requestId } } });
      return sendRedirect(event, resultPath(attempt.intent, "linked", provider.key));
    }

    if (attempt.intent === "REAUTH") {
      const admin = await assertInitiator(event, attempt);
      const linked = await useDatabase().oAuthIdentity.findUnique({ where: { providerId_issuer_subject: { providerId: provider.id, issuer: identity.issuer, subject: identity.subject } } });
      if (!linked || linked.userId !== admin.user.id) throw createError({ statusCode: 403, statusMessage: "Use a linked identity to re-authenticate." });
      await useDatabase().adminSession.update({ where: { id: admin.session.id }, data: { authenticatedAt: new Date() } });
      return sendRedirect(event, resultPath(attempt.intent, "reauthenticated", provider.key));
    }

    const authenticatedAt = new Date();
    const login = await serializable(async (transaction) => {
      const currentProvider = await transaction.oAuthProvider.findUnique({ where: { id: provider.id } });
      if (!currentProvider?.enabled || currentProvider.activeConfigVersion !== attempt.configVersion) throw createError({ statusCode: 409, statusMessage: "Provider changed during login." });
      const linked = await transaction.oAuthIdentity.findUnique({ where: { providerId_issuer_subject: { providerId: provider.id, issuer: identity.issuer, subject: identity.subject } }, include: { user: true } });
      if (!linked || linked.user.status !== "ACTIVE") throw createError({ statusCode: 401, statusMessage: "This identity is not linked to an active administrator." });
      const session = await transaction.adminSession.create({ data: { userId: linked.user.id, providerId: provider.id, authMethod: "oauth", authenticatedAt, expiresAt: sessionExpiry() } });
      await transaction.auditLog.create({ data: { actorId: linked.user.id, action: "login.success", entityType: "AdminSession", entityId: session.id, metadata: { authMethod: "oauth", providerKey: provider.key, requestId: event.context.requestId } } });
      return { session, user: linked.user, authenticatedAt };
    }, useDatabase());
    await installProviderSession(event, login);
    return sendRedirect(event, "/admin");
  } catch (error) {
    await useDatabase().auditLog.create({ data: { actorId: attempt.initiatingUserId ?? undefined, action: "oauth.failure", entityType: "OAuthProvider", entityId: attempt.providerId, metadata: { intent: attempt.intent, requestId: event.context.requestId } as Prisma.InputJsonValue } });
    return sendRedirect(event, resultPath(attempt.intent, "failed", providerKey));
  }
}
