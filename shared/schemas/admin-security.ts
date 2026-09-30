import { z } from "zod";

const providerOptionsSchema = z.union([
  z.object({ type: z.literal("google") }),
  z.object({
    type: z.literal("microsoft"),
    tenant: z.string().trim().min(1).max(120).regex(/^[a-zA-Z0-9.-]+$/),
    accountPolicy: z.enum(["single-tenant", "organizations", "common"]).default("single-tenant"),
  }),
  z.object({ type: z.literal("github"), emailRequired: z.boolean().default(true) }),
]);

export const providerDraftSchema = z.object({
  expectedVersion: z.number().int().positive(),
  label: z.string().trim().min(1).max(120),
  clientId: z.string().trim().min(1).max(500),
  clientSecret: z.string().min(1).max(2000).optional(),
  sortOrder: z.number().int().min(0).max(100),
  options: providerOptionsSchema,
});
