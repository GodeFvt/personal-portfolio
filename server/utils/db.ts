import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import { getServerEnv } from "./env";

const globalForPrisma = globalThis as typeof globalThis & {
  portfolioPrisma?: PrismaClient;
};

export function useDatabase() {
  if (!globalForPrisma.portfolioPrisma) {
    const { runtimeDatabaseUrl } = getServerEnv();
    globalForPrisma.portfolioPrisma = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: runtimeDatabaseUrl,
        max: process.env.VERCEL ? 1 : 5,
        connectionTimeoutMillis: 10_000,
        idleTimeoutMillis: 10_000,
      }),
    });
  }

  return globalForPrisma.portfolioPrisma;
}
