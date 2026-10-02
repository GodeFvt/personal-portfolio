import { z } from "zod";

const roleKeySchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const roleIdsSchema = z.array(z.string().uuid()).max(32);

export const createInvitationSchema = z.object({
  email: z.string().trim().email().max(320),
  roleIds: roleIdsSchema.min(1),
  expiresInDays: z.number().int().min(1).max(30).default(7),
});

export const createRoleSchema = z.object({
  key: roleKeySchema,
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).nullable().optional(),
  permissionKeys: z.array(z.string().trim().min(1).max(100)).max(64),
});

export const updateRoleSchema = createRoleSchema.omit({ key: true }).extend({
  expectedVersion: z.number().int().positive(),
});

export const updateAdminUserSchema = z.object({
  expectedVersion: z.number().int().positive(),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
  roleIds: roleIdsSchema.min(1),
});

export type UpdateAdminUserInput = z.infer<typeof updateAdminUserSchema>;

export const providerOptionsSchema = z.union([
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

export const providerActivationSchema = z.object({
  expectedVersion: z.number().int().positive(),
  configVersion: z.number().int().positive(),
});

export const providerDisableSchema = z.object({
  expectedVersion: z.number().int().positive(),
});

export const oauthStartSchema = z.object({
  intent: z.enum(["LOGIN", "INVITE", "LINK", "TEST", "REAUTH"]).default("LOGIN"),
  invitationToken: z.string().min(32).max(512).optional(),
}).superRefine((value, context) => {
  if (value.intent === "INVITE" && !value.invitationToken) {
    context.addIssue({ code: "custom", path: ["invitationToken"], message: "Invitation token is required." });
  }
});
