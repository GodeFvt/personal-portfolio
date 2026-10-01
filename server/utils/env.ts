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
    STORAGE_PROVIDER: z.enum(["local", "vercel-blob"]).default("local"),
    LOCAL_STORAGE_DIR: z.string().min(1).default(".data/media"),
    BLOB_STORE_ID: z.string().min(1).optional(),
    BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
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
