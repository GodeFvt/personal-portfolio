import { z } from "zod";

export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens.");

export const portfolioTemplateSchema = z.enum([
  "introduction",
  "project-list",
  "experience-list",
  "skill-list",
  "contact",
  "custom-page",
]);

const headingBlockSchema = z.object({
  kicker: z.string().max(120).optional(),
  heading: z.string().min(1).max(240),
  description: z.string().max(1000).optional(),
});

export const pageBlockPropsSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), content: z.string().min(1).max(10000) }),
  z.object({ type: z.literal("image"), mediaId: z.string().uuid(), alt: z.string().min(1).max(300) }),
  z.object({ type: z.literal("link-list"), heading: z.string().max(240).optional(), links: z.array(z.object({ label: z.string().min(1), url: z.string().url(), description: z.string().optional() })).max(30) }),
  z.object({ type: z.literal("project-grid"), heading: headingBlockSchema.optional(), featuredOnly: z.boolean().default(false), includeArchived: z.boolean().default(false) }),
  z.object({ type: z.literal("timeline"), heading: headingBlockSchema.optional() }),
  z.object({ type: z.literal("skill-group"), heading: headingBlockSchema.optional() }),
]);
