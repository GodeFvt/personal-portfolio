import { MediaProvider } from "~~/generated/prisma/client";
import { getServerEnv } from "../utils/env";
import { createLocalStorage } from "./local";
import { createS3Storage } from "./s3";
import type { MediaStorage } from "./types";
import { createVercelBlobStorage } from "./vercel-blob";

export function configuredMediaProvider() {
  const provider = getServerEnv().STORAGE_PROVIDER;
  if (provider === "vercel-blob") return MediaProvider.VERCEL_BLOB;
  if (provider === "cloudflare-r2") return MediaProvider.CLOUDFLARE_R2;
  if (provider === "minio") return MediaProvider.MINIO;
  return MediaProvider.LOCAL;
}

export const uploadProviderMap = {
  "vercel-blob": MediaProvider.VERCEL_BLOB,
  "cloudflare-r2": MediaProvider.CLOUDFLARE_R2,
  minio: MediaProvider.MINIO,
} as const;

export type UploadProviderKey = keyof typeof uploadProviderMap;

export function availableMediaProviders() {
  const env = getServerEnv();
  return [
    { key: "vercel-blob" as const, label: "Vercel Blob", enabled: Boolean(env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_OIDC_TOKEN) },
    { key: "cloudflare-r2" as const, label: "Cloudflare R2", enabled: Boolean(env.R2_ACCOUNT_ID && env.R2_BUCKET && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY) },
    { key: "minio" as const, label: "MinIO (local)", enabled: !process.env.VERCEL && Boolean(env.MINIO_ENDPOINT && env.MINIO_BUCKET && env.MINIO_ACCESS_KEY && env.MINIO_SECRET_KEY) },
  ];
}

export function resolveUploadProvider(requested?: UploadProviderKey) {
  const configured = configuredMediaProvider();
  if (!requested) return configured;
  const provider = availableMediaProviders().find((candidate) => candidate.key === requested);
  if (!provider?.enabled) throw new Error(`${provider?.label ?? requested} is not configured for this environment.`);
  return uploadProviderMap[requested];
}

export function mediaStorage(provider: MediaProvider): MediaStorage {
  const env = getServerEnv();
  if (provider === MediaProvider.VERCEL_BLOB) return createVercelBlobStorage(env.BLOB_READ_WRITE_TOKEN);
  if (provider === MediaProvider.CLOUDFLARE_R2) {
    return createS3Storage({
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      region: "auto",
      bucket: env.R2_BUCKET!,
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    });
  }
  if (provider === MediaProvider.MINIO) {
    return createS3Storage({
      endpoint: env.MINIO_ENDPOINT!,
      publicEndpoint: env.MINIO_PUBLIC_ENDPOINT,
      region: "us-east-1",
      bucket: env.MINIO_BUCKET!,
      accessKeyId: env.MINIO_ACCESS_KEY!,
      secretAccessKey: env.MINIO_SECRET_KEY!,
      forcePathStyle: true,
      autoCreateBucket: true,
    });
  }
  return createLocalStorage(env.LOCAL_STORAGE_DIR);
}

