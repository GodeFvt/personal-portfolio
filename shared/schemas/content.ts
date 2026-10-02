import { z } from "zod";

export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers, and hyphens.",
  );

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
  z
    .object({
      type: z.literal("text"),
      variant: z
        .enum(["body", "heading", "hero", "origin", "signoff"])
        .optional(),
      content: z.string().max(10000).optional(),
      kicker: z.string().max(120).optional(),
      heading: z.string().max(240).optional(),
      description: z.string().max(1000).optional(),
      fullName: z.string().max(160).optional(),
      roleLabel: z.string().max(160).optional(),
      primaryAction: z
        .object({ label: z.string().max(120), tabSlug: slugSchema })
        .optional(),
      secondaryAction: z
        .object({ label: z.string().max(120), tabSlug: slugSchema })
        .optional(),
    })
    .refine(
      (value) =>
        Boolean(
          value.content?.trim() ||
          value.heading?.trim() ||
          value.description?.trim(),
        ),
      "Enter a heading or text.",
    ),
  z.object({
    type: z.literal("image"),
    mediaId: z.string().uuid(),
    alt: z.string().min(1).max(300),
  }),
  z.object({
    type: z.literal("link-list"),
    heading: z.string().max(240).optional(),
    links: z
      .array(
        z.object({
          label: z.string().min(1),
          url: z.string().refine((value) => {
            if (/^\/(?!\/)[^\s]*$/.test(value)) return true;
            try {
              return ["https:", "http:", "mailto:"].includes(
                new URL(value).protocol,
              );
            } catch {
              return false;
            }
          }, "Use an http, https, mailto URL or a site path."),
          description: z.string().optional(),
          year: z.string().max(30).optional(),
        }),
      )
      .max(30),
  }),
  z.object({
    type: z.literal("project-grid"),
    heading: headingBlockSchema.optional(),
    featuredOnly: z.boolean().default(false),
    includeArchived: z.boolean().default(false),
  }),
  z.object({
    type: z.literal("timeline"),
    heading: headingBlockSchema.optional(),
  }),
  z.object({
    type: z.literal("skill-group"),
    variant: z.literal("focus-strip").optional(),
    heading: z.union([headingBlockSchema, z.string().max(240)]).optional(),
    items: z.array(z.string().max(240)).max(30).optional(),
  }),
]);
