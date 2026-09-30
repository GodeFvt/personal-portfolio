import "dotenv/config";
import { ZodError } from "zod";
import { getServerEnv } from "../server/utils/env";

try {
  const env = getServerEnv();
  console.log({
    database: env.DATABASE_URL
      ? "DATABASE_URL"
      : env.POSTGRES_URL
        ? "POSTGRES_URL"
        : "PRISMA_DATABASE_URL",
    migrations: env.DIRECT_URL ? "DIRECT_URL" : "database fallback",
    storage: env.STORAGE_PROVIDER,
    blobAuth:
      env.STORAGE_PROVIDER === "vercel-blob"
        ? process.env.VERCEL_OIDC_TOKEN
          ? "Vercel OIDC"
          : "BLOB_READ_WRITE_TOKEN"
        : "not required",
  });
} catch (error) {
  if (error instanceof ZodError) {
    console.error("Environment validation failed:");
    for (const issue of error.issues) console.error(`- ${issue.path.join(".")}: ${issue.message}`);
    process.exitCode = 1;
  } else {
    throw error;
  }
}
