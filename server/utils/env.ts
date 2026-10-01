import { z } from "zod";

const optionalConnectionUrl = z.string().url().optional();

function isPostgresUrl(value: string | undefined): value is string {
  return Boolean(value?.startsWith("postgres://") || value?.startsWith("postgresql://"));
}

const serverEnvSchema = z
  .object({
    DATABASE_URL: optionalConnectionUrl,
    POSTGRES_URL: optionalConnectionUrl,
    PRISMA_DATABASE_URL: optionalConnectionUrl,
    DIRECT_URL: optionalConnectionUrl,
    STORAGE_PROVIDER: z.enum(["local", "vercel-blob", "cloudflare-r2", "minio"]).default("local"),
    LOCAL_STORAGE_DIR: z.string().min(1).default(".data/media"),
    BLOB_STORE_ID: z.string().min(1).optional(),
    BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
    R2_ACCOUNT_ID: z.string().min(1).optional(),
    R2_BUCKET: z.string().min(1).optional(),
    R2_ACCESS_KEY_ID: z.string().min(1).optional(),
    R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    MINIO_ENDPOINT: z.string().url().optional(),
    MINIO_PUBLIC_ENDPOINT: z.string().url().optional(),
    MINIO_BUCKET: z.string().min(1).optional(),
    MINIO_ACCESS_KEY: z.string().min(1).optional(),
    MINIO_SECRET_KEY: z.string().min(1).optional(),
    MEDIA_UPLOAD_SECRET: z.string().min(32).optional(),
    MEDIA_LINK_SECRET: z.string().min(32).optional(),
    SCHEDULED_JOB_SECRET: z.string().min(32).optional(),
    NUXT_SESSION_PASSWORD: z.string().min(32).optional(),
    NUXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
    OAUTH_SECRET_KEYS: z.string().min(1).optional(),
    OAUTH_ACTIVE_KEY_VERSION: z.coerce.number().int().positive().optional(),
  })
  .superRefine((env, context) => {
    if (![env.DATABASE_URL, env.POSTGRES_URL, env.PRISMA_DATABASE_URL].some(isPostgresUrl)) {
      context.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message:
          "Set DATABASE_URL, POSTGRES_URL, or PRISMA_DATABASE_URL to a postgres:// or postgresql:// URL.",
      });
    }
    if (env.STORAGE_PROVIDER === "vercel-blob" && !env.BLOB_READ_WRITE_TOKEN && !process.env.VERCEL_OIDC_TOKEN) {
      context.addIssue({
        code: "custom",
        path: ["BLOB_READ_WRITE_TOKEN"],
        message:
          "Vercel Blob needs project OIDC on Vercel or BLOB_READ_WRITE_TOKEN outside Vercel.",
      });
    }
    if (env.STORAGE_PROVIDER === "cloudflare-r2" && ![env.R2_ACCOUNT_ID, env.R2_BUCKET, env.R2_ACCESS_KEY_ID, env.R2_SECRET_ACCESS_KEY].every(Boolean)) {
      context.addIssue({ code: "custom", path: ["R2_BUCKET"], message: "Cloudflare R2 needs account, bucket, access key, and secret key configuration." });
    }
    if (env.STORAGE_PROVIDER === "minio" && ![env.MINIO_ENDPOINT, env.MINIO_BUCKET, env.MINIO_ACCESS_KEY, env.MINIO_SECRET_KEY].every(Boolean)) {
      context.addIssue({ code: "custom", path: ["MINIO_BUCKET"], message: "MinIO needs endpoint, bucket, access key, and secret key configuration." });
    }
    if ((process.env.NODE_ENV === "production" || process.env.VERCEL) && !env.NUXT_SESSION_PASSWORD) {
      context.addIssue({
        code: "custom",
        path: ["NUXT_SESSION_PASSWORD"],
        message: "NUXT_SESSION_PASSWORD must contain at least 32 characters in production.",
      });
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema> & {
  runtimeDatabaseUrl: string;
  migrationDatabaseUrl: string;
};

let cachedEnv: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (cachedEnv) return cachedEnv;

  const parsed = serverEnvSchema.parse(process.env);
  const runtimeDatabaseUrl = [
    parsed.DATABASE_URL,
    parsed.POSTGRES_URL,
    parsed.PRISMA_DATABASE_URL,
  ].find(isPostgresUrl)!;

  const migrationDatabaseUrl = isPostgresUrl(parsed.DIRECT_URL)
    ? parsed.DIRECT_URL
    : runtimeDatabaseUrl;

  cachedEnv = {
    ...parsed,
    runtimeDatabaseUrl,
    migrationDatabaseUrl,
  };

  return cachedEnv;
}

export function resetServerEnvForTests() {
  cachedEnv = undefined;
}
