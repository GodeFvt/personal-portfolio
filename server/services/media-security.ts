import { createHmac, timingSafeEqual } from "node:crypto";
import { mediaMimeTypeSchema, mediaSizeLimit } from "../../shared/schemas/media";
import { getServerEnv } from "../utils/env";

interface UploadGrant {
  assetId: string;
  sessionId: string;
  userId: string;
  expiresAt: number;
}

function uploadSecret() {
  const env = getServerEnv();
  const secret = env.MEDIA_UPLOAD_SECRET || env.NUXT_SESSION_PASSWORD;
  if (!secret) throw new Error("MEDIA_UPLOAD_SECRET or NUXT_SESSION_PASSWORD is required for uploads.");
  return secret;
}

export function issueMediaUploadToken(input: Omit<UploadGrant, "expiresAt">) {
  const payload = Buffer.from(JSON.stringify({ ...input, expiresAt: Date.now() + 10 * 60 * 1000 })).toString("base64url");
  const signature = createHmac("sha256", uploadSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyMediaUploadToken(token: string, expected: { assetId: string; sessionId?: string; userId?: string }) {
  const [payload, receivedSignature] = token.split(".");
  if (!payload || !receivedSignature) return null;
  const signature = createHmac("sha256", uploadSecret()).update(payload).digest("base64url");
  const left = Buffer.from(receivedSignature);
  const right = Buffer.from(signature);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const grant = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as UploadGrant;
    if (
      grant.assetId !== expected.assetId ||
      (expected.sessionId && grant.sessionId !== expected.sessionId) ||
      (expected.userId && grant.userId !== expected.userId) ||
      grant.expiresAt <= Date.now()
    ) return null;
    return grant;
  } catch {
    return null;
  }
}

export function safeOriginalName(value: string) {
  return value.normalize("NFKC").replace(/[\\/\0-\x1f\x7f]/g, "_").replace(/\s+/g, " ").trim().slice(0, 240);
}

function imageDimensions(buffer: Buffer, mimeType: string) {
  if (mimeType === "image/png" && buffer.length >= 24) return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  if (mimeType === "image/webp" && buffer.length >= 30) {
    const kind = buffer.toString("ascii", 12, 16);
    if (kind === "VP8X") return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
    if (kind === "VP8 ") return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
    if (kind === "VP8L" && buffer.length >= 25) {
      const bits = buffer.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
  }
  if (mimeType === "image/jpeg") {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) { offset++; continue; }
      const marker = buffer[offset + 1]!;
      const length = buffer.readUInt16BE(offset + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
      }
      if (length < 2) break;
      offset += 2 + length;
    }
  }
  return {};
}

export function inspectMedia(buffer: Buffer, claimedMimeType: string) {
  const mimeType =
    buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff ? "image/jpeg" :
    buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ? "image/png" :
    buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP" ? "image/webp" :
    buffer.length >= 5 && buffer.toString("ascii", 0, 5) === "%PDF-" ? "application/pdf" : null;
  if (!mimeType || mimeType !== claimedMimeType || !mediaMimeTypeSchema.safeParse(mimeType).success) throw new Error("File contents do not match the declared media type.");
  if (buffer.length > mediaSizeLimit(mimeType)) throw new Error("The uploaded file is too large.");
  return { mimeType, size: buffer.length, ...imageDimensions(buffer, mimeType) };
}

