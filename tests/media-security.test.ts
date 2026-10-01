import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";
import { inspectMedia, issueMediaUploadToken, verifyMediaUploadToken } from "../server/services/media-security";
import { resolveLocalStoragePath } from "../server/storage/local";
import { mediaSizeLimit, startMediaUploadSchema } from "../shared/schemas/media";
import { resetServerEnvForTests } from "../server/utils/env";

process.env.DATABASE_URL ||= "postgresql://portfolio:portfolio@localhost:5432/portfolio";
process.env.NUXT_SESSION_PASSWORD = "test-only-session-secret-at-least-32-characters";
resetServerEnvForTests();

test("media upload schema enforces per-type size limits", () => {
  const base = { id: crypto.randomUUID(), originalName: "cover.png", alt: "Project cover" };
  assert.equal(startMediaUploadSchema.safeParse({ ...base, mimeType: "image/png", size: mediaSizeLimit("image/png") }).success, true);
  assert.equal(startMediaUploadSchema.safeParse({ ...base, mimeType: "image/png", size: mediaSizeLimit("image/png") + 1 }).success, false);
  assert.equal(startMediaUploadSchema.safeParse({ ...base, mimeType: "image/svg+xml", size: 100 }).success, false);
});

test("signature verification rejects MIME spoofing and reads PNG dimensions", () => {
  const png = Buffer.alloc(32);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png);
  png.writeUInt32BE(640, 16);
  png.writeUInt32BE(480, 20);
  assert.deepEqual(inspectMedia(png, "image/png"), { mimeType: "image/png", size: 32, width: 640, height: 480 });
  assert.throws(() => inspectMedia(png, "image/jpeg"), /do not match/);
  assert.throws(() => inspectMedia(Buffer.from("<svg></svg>"), "image/png"), /do not match/);
});

test("upload grants are scoped to asset, session, and user and reject tampering", () => {
  const grant = { assetId: crypto.randomUUID(), sessionId: crypto.randomUUID(), userId: crypto.randomUUID() };
  const token = issueMediaUploadToken(grant);
  assert.ok(verifyMediaUploadToken(token, grant));
  assert.equal(verifyMediaUploadToken(token, { ...grant, assetId: crypto.randomUUID() }), null);
  assert.equal(verifyMediaUploadToken(`${token.slice(0, -1)}x`, grant), null);
});

test("local storage paths cannot escape the configured directory", () => {
  const base = resolve(".data", "media-test");
  assert.equal(resolveLocalStoragePath(base, "uploads/id/file.png"), resolve(base, "uploads/id/file.png"));
  assert.throws(() => resolveLocalStoragePath(base, "../outside.txt"), /Invalid media storage key/);
  assert.throws(() => resolveLocalStoragePath(base, ""), /Invalid media storage key/);
});
