import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { getServerEnv } from "./env";

interface SecretEnvelope {
  version: number;
  iv: string;
  tag: string;
  ciphertext: string;
}

function keyring() {
  const source = getServerEnv().OAUTH_SECRET_KEYS;
  const keys = new Map<number, Buffer>();
  for (const entry of source?.split(",") ?? []) {
    const separator = entry.indexOf(":");
    if (separator < 1) continue;
    const version = Number(entry.slice(0, separator));
    const key = Buffer.from(entry.slice(separator + 1), "base64");
    if (Number.isInteger(version) && version > 0 && key.length === 32) keys.set(version, key);
  }
  return keys;
}

export function activeSecretKeyVersion() {
  const version = getServerEnv().OAUTH_ACTIVE_KEY_VERSION;
  if (!version || !keyring().has(version)) {
    throw new Error("OAuth secret encryption keyring is not configured.");
  }
  return version;
}

export function encryptSecret(plaintext: string) {
  const version = activeSecretKeyVersion();
  const key = keyring().get(version)!;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const envelope: SecretEnvelope = {
    version,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
  return { ciphertext: Buffer.from(JSON.stringify(envelope)).toString("base64url"), keyVersion: version };
}

export function decryptSecret(encoded: string) {
  const envelope = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SecretEnvelope;
  const key = keyring().get(envelope.version);
  if (!key) throw new Error(`OAuth secret key version ${envelope.version} is unavailable.`);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(envelope.iv, "base64"));
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
