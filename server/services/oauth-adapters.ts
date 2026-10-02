import { HttpStatus } from "../utils/http-status";
import { createHash } from "node:crypto";
import { createRemoteJWKSet, decodeJwt, jwtVerify } from "jose";
import { createError } from "h3";
import { providerOptionsSchema } from "../../shared/schemas/admin-security";

export interface OAuthRuntimeConfig {
  type: string;
  clientId: string;
  clientSecret: string;
  options: unknown;
}

export interface OAuthIdentityResult {
  issuer: string;
  subject: string;
  email: string | null;
  emailVerified: boolean;
}

const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

function base64urlSha256(value: string) {
  return createHash("sha256").update(value).digest("base64url");
}

function assertNonce(payloadNonce: unknown, nonceHash: string | null) {
  if (!nonceHash || typeof payloadNonce !== "string" || base64urlSha256(payloadNonce) !== nonceHash) {
    throw createError({ statusCode: HttpStatus.UNAUTHORIZED, statusMessage: "OAuth nonce validation failed." });
  }
}

function microsoftTenant(options: Extract<ReturnType<typeof providerOptionsSchema.parse>, { type: "microsoft" }>) {
  if (options.accountPolicy === "common") return "common";
  if (options.accountPolicy === "organizations") return "organizations";
  return options.tenant;
}

export function authorizationRequest(input: {
  config: OAuthRuntimeConfig;
  redirectUri: string;
  state: string;
  nonce: string;
  codeChallenge: string;
}) {
  const options = providerOptionsSchema.parse(input.config.options);
  const common = {
    client_id: input.config.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    state: input.state,
    code_challenge: input.codeChallenge,
    code_challenge_method: "S256",
  };
  if (options.type === "google") {
    return { url: "https://accounts.google.com/o/oauth2/v2/auth", params: { ...common, scope: "openid email profile", nonce: input.nonce, prompt: "select_account" } };
  }
  if (options.type === "microsoft") {
    const tenant = microsoftTenant(options);
    return { url: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`, params: { ...common, scope: "openid email profile", nonce: input.nonce, response_mode: "query", prompt: "select_account" } };
  }
  return { url: "https://github.com/login/oauth/authorize", params: { ...common, scope: options.emailRequired ? "read:user user:email" : "read:user", allow_signup: "false", prompt: "select_account" } };
}

async function exchangeToken(url: string, body: Record<string, string>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
    redirect: "error",
  });
  const payload = await response.json() as Record<string, unknown>;
  if (!response.ok || typeof payload.access_token !== "string") {
    throw createError({ statusCode: HttpStatus.UNAUTHORIZED, statusMessage: "OAuth token exchange failed." });
  }
  return payload;
}

async function fetchJson(url: string, accessToken: string, headers: Record<string, string> = {}) {
  const response = await fetch(url, { headers: { ...headers, accept: "application/json", authorization: `Bearer ${accessToken}` }, redirect: "error" });
  if (!response.ok) throw createError({ statusCode: HttpStatus.UNAUTHORIZED, statusMessage: "OAuth identity lookup failed." });
  return response.json() as Promise<Record<string, unknown>>;
}

export async function completeAuthorization(input: {
  config: OAuthRuntimeConfig;
  redirectUri: string;
  code: string;
  codeVerifier: string;
  nonceHash: string | null;
}): Promise<OAuthIdentityResult> {
  const options = providerOptionsSchema.parse(input.config.options);
  const baseTokenBody = {
    grant_type: "authorization_code",
    client_id: input.config.clientId,
    client_secret: input.config.clientSecret,
    redirect_uri: input.redirectUri,
    code: input.code,
    code_verifier: input.codeVerifier,
  };

  if (options.type === "google") {
    const tokens = await exchangeToken("https://oauth2.googleapis.com/token", baseTokenBody);
    if (typeof tokens.id_token !== "string") throw createError({ statusCode: HttpStatus.UNAUTHORIZED, statusMessage: "Google did not return an ID token." });
    const { payload } = await jwtVerify(tokens.id_token, GOOGLE_JWKS, { issuer: GOOGLE_ISSUERS, audience: input.config.clientId });
    assertNonce(payload.nonce, input.nonceHash);
    if (typeof payload.sub !== "string") throw createError({ statusCode: HttpStatus.UNAUTHORIZED, statusMessage: "Google identity is incomplete." });
    return { issuer: String(payload.iss), subject: payload.sub, email: typeof payload.email === "string" ? payload.email.toLowerCase() : null, emailVerified: payload.email_verified === true };
  }

  if (options.type === "microsoft") {
    const tenant = microsoftTenant(options);
    const tokens = await exchangeToken(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, baseTokenBody);
    if (typeof tokens.id_token !== "string") throw createError({ statusCode: HttpStatus.UNAUTHORIZED, statusMessage: "Microsoft did not return an ID token." });
    const unverified = decodeJwt(tokens.id_token);
    if (typeof unverified.tid !== "string" || !/^[0-9a-f-]{36}$/i.test(unverified.tid)) throw createError({ statusCode: HttpStatus.UNAUTHORIZED, statusMessage: "Microsoft tenant is invalid." });
    const expectedIssuer = `https://login.microsoftonline.com/${unverified.tid}/v2.0`;
    if (options.accountPolicy === "single-tenant" && typeof unverified.iss === "string" && unverified.iss !== expectedIssuer) throw createError({ statusCode: HttpStatus.UNAUTHORIZED, statusMessage: "Microsoft issuer is invalid." });
    const jwks = createRemoteJWKSet(new URL(`https://login.microsoftonline.com/${tenant}/discovery/v2.0/keys`));
    const { payload } = await jwtVerify(tokens.id_token, jwks, { issuer: expectedIssuer, audience: input.config.clientId });
    assertNonce(payload.nonce, input.nonceHash);
    if (typeof payload.sub !== "string") throw createError({ statusCode: HttpStatus.UNAUTHORIZED, statusMessage: "Microsoft identity is incomplete." });
    const email = typeof payload.email === "string" ? payload.email : typeof payload.preferred_username === "string" ? payload.preferred_username : null;
    return { issuer: expectedIssuer, subject: payload.sub, email: email?.toLowerCase() ?? null, emailVerified: Boolean(email) };
  }

  const tokens = await exchangeToken("https://github.com/login/oauth/access_token", baseTokenBody);
  const accessToken = tokens.access_token as string;
  const headers = { "user-agent": "phuttinan-portfolio-oauth", "x-github-api-version": "2022-11-28" };
  const user = await fetchJson("https://api.github.com/user", accessToken, headers);
  if (typeof user.id !== "number") throw createError({ statusCode: HttpStatus.UNAUTHORIZED, statusMessage: "GitHub identity is incomplete." });
  let email = typeof user.email === "string" ? user.email.toLowerCase() : null;
  let emailVerified = false;
  if (options.emailRequired || !email) {
    const response = await fetch("https://api.github.com/user/emails", { headers: { ...headers, accept: "application/vnd.github+json", authorization: `Bearer ${accessToken}` }, redirect: "error" });
    if (!response.ok) throw createError({ statusCode: HttpStatus.UNAUTHORIZED, statusMessage: "GitHub email lookup failed." });
    const emails = await response.json() as Array<{ email?: string; primary?: boolean; verified?: boolean }>;
    const primary = emails.find((item) => item.primary && item.verified);
    email = primary?.email?.toLowerCase() ?? null;
    emailVerified = Boolean(primary);
  }
  if (options.emailRequired && (!email || !emailVerified)) throw createError({ statusCode: HttpStatus.UNAUTHORIZED, statusMessage: "A verified GitHub email is required." });
  return { issuer: "https://github.com", subject: String(user.id), email, emailVerified };
}
