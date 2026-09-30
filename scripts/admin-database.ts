import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString =
  process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.PRISMA_DATABASE_URL;

if (!connectionString) {
  throw new Error("Set DATABASE_URL, POSTGRES_URL, or PRISMA_DATABASE_URL.");
}

export const adminDatabase = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
