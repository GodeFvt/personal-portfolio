import { createHmac, timingSafeEqual } from "node:crypto";
import { getServerEnv } from "../utils/env";

const MIN_LINK_LIFETIME_SECONDS = 60;
export const MAX_MEDIA_LINK_LIFETIME_SECONDS = 7 * 24 * 60 * 60;

function linkSecret() {
  const env = getServerEnv();
  const secret = env.MEDIA_LINK_SECRET || env.MEDIA_UPLOAD_SECRET || env.NUXT_SESSION_PASSWORD;
  if (!secret) throw new Error("MEDIA_LINK_SECRET, MEDIA_UPLOAD_SECRET, or NUXT_SESSION_PASSWORD is required for private media links.");
  return secret;
}

function linkPayload(assetId: string, expiresAt: number) {
  return `${assetId}.${expiresAt}`;
}

export function issuePrivateMediaLink(assetId: string, lifetimeSeconds: number, now = Date.now()) {
  if (!Number.isInteger(lifetimeSeconds) || lifetimeSeconds < MIN_LINK_LIFETIME_SECONDS || lifetimeSeconds > MAX_MEDIA_LINK_LIFETIME_SECONDS) {
    throw new Error("Invalid private media link lifetime.");
  }
  const expiresAt = Math.floor(now / 1000) + lifetimeSeconds;
  const signature = createHmac("sha256", linkSecret()).update(linkPayload(assetId, expiresAt)).digest("base64url");
  return { expiresAt, signature };
}

export function verifyPrivateMediaLink(assetId: string, expiresAt: number, receivedSignature: string, now = Date.now()) {
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(now / 1000) || !receivedSignature) return false;
  const expectedSignature = createHmac("sha256", linkSecret()).update(linkPayload(assetId, expiresAt)).digest("base64url");
  const received = Buffer.from(receivedSignature);
  const expected = Buffer.from(expectedSignature);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function mediaUrl(assetId: string) {
  const baseUrl = getServerEnv().NUXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  return `${baseUrl}/api/media/${encodeURIComponent(assetId)}`;
}

export function signedMediaUrl(assetId: string, lifetimeSeconds: number) {
  const grant = issuePrivateMediaLink(assetId, lifetimeSeconds);
  const url = new URL(mediaUrl(assetId));
  url.searchParams.set("expires", String(grant.expiresAt));
  url.searchParams.set("signature", grant.signature);
  return { url: url.toString(), expiresAt: new Date(grant.expiresAt * 1000).toISOString() };
}
