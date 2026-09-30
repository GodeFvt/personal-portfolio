import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "~~/generated/prisma/client";
import { getServerEnv } from "./env";

const globalForPrisma = globalThis as typeof globalThis & {
  portfolioPrisma?: PrismaClient;
};

export function useDatabase() {
  if (!globalForPrisma.portfolioPrisma) {
    const { runtimeDatabaseUrl } = getServerEnv();
    globalForPrisma.portfolioPrisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: runtimeDatabaseUrl }),
    });
  }

  return globalForPrisma.portfolioPrisma;
}
