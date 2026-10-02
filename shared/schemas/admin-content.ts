import { z } from "zod";
import { pageBlockPropsSchema, slugSchema } from "./content";

export const navigationGroupSnapshotSchema = z.object({
  label: z.string().trim().min(1).max(120),
  sortOrder: z.number().int().min(0).max(10000),
  visibility: z.enum(["VISIBLE", "HIDDEN", "ARCHIVED"]),
});

export const adminPageBlockSchema = z
  .object({
    type: z.enum([
      "TEXT",
      "IMAGE",
      "LINK_LIST",
      "PROJECT_GRID",
      "TIMELINE",
      "SKILL_GROUP",
    ]),
    props: pageBlockPropsSchema,
  })
  .refine(
    (block) =>
      block.type.toLowerCase().replaceAll("_", "-") === block.props.type,
    "Block type must match its content.",
  );

export const savePageContentSchema = z.object({
  expectedVersion: z.number().int().min(0),
  template: z.enum([
    "INTRODUCTION",
    "PROJECT_LIST",
    "EXPERIENCE_LIST",
    "SKILL_LIST",
    "CONTACT",
    "CUSTOM_PAGE",
  ]),
  blocks: z.array(adminPageBlockSchema).max(60),
});

export const deletePortfolioTabSchema = z.object({
  expectedVersion: z.number().int().min(0),
});

export const portfolioTabSnapshotSchema = z.object({
  groupId: z.string().uuid(),
  slug: slugSchema,
  label: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500),
  icon: z.string().trim().min(1).max(80),
  template: z.enum([
    "INTRODUCTION",
    "PROJECT_LIST",
    "EXPERIENCE_LIST",
    "SKILL_LIST",
    "CONTACT",
    "CUSTOM_PAGE",
  ]),
  sortOrder: z.number().int().min(0).max(10000),
  publicationState: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  blocks: z.array(adminPageBlockSchema).max(60).default([]),
});

const nullableUuid = z.string().uuid().nullable();
function usesProtocol(value: string, protocols: string[]) {
  try {
    return protocols.includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
const externalUrlSchema = z
  .string()
  .url()
  .refine(
    (value) => usesProtocol(value, ["http:", "https:", "mailto:"]),
    "Use an http, https, or mailto URL.",
  );
const httpUrlSchema = z
  .string()
  .url()
  .refine(
    (value) => usesProtocol(value, ["http:", "https:"]),
    "Use an http or https URL.",
  );
const siteUrlSchema = z.union([
  externalUrlSchema,
  z
    .string()
    .regex(
      /^\/(?!\/)[^\s]*$/,
      "Use an absolute URL or a site path beginning with /.",
    ),
]);
const nullableUrl = z.union([siteUrlSchema, z.literal("")]).nullable();
const nullableHttpUrl = z.union([httpUrlSchema, z.literal("")]).nullable();

export const profileSnapshotSchema = z.object({
  name: z.string().trim().min(1).max(160),
  alias: z.string().trim().min(1).max(80),
  role: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(320),
  bio: z.string().trim().min(1).max(3000),
  focus: z.string().trim().min(1).max(500),
  interests: z.array(z.string().trim().min(1).max(80)).max(30),
  location: z.string().trim().min(1).max(160),
  legacyPortraitUrl: nullableUrl,
  legacyResumeUrl: nullableUrl,
  portraitMediaId: nullableUuid,
  resumeMediaId: nullableUuid,
  education: z
    .array(
      z.object({
        degree: z.string().trim().min(1).max(240),
        institution: z.string().trim().min(1).max(240),
        period: z.string().trim().min(1).max(120),
      }),
    )
    .max(20),
  socialLinks: z
    .array(
      z.object({
        type: z.string().trim().min(1).max(50),
        label: z.string().trim().min(1).max(120),
        url: siteUrlSchema,
      }),
    )
    .max(30),
});

export const projectSnapshotSchema = z.object({
  slug: slugSchema,
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(120),
  period: z.string().trim().min(1).max(120),
  summary: z.string().trim().min(1).max(3000),
  imageAlt: z.string().trim().min(1).max(300),
  illustration: z.string().trim().max(80).nullable(),
  liveUrl: nullableHttpUrl,
  repoUrl: nullableHttpUrl,
  coverMediaId: nullableUuid,
  featured: z.boolean(),
  archived: z.boolean(),
  sortOrder: z.number().int().min(0).max(10000),
  publicationState: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  highlights: z.array(z.string().trim().min(1).max(500)).max(30),
  technologyIds: z.array(z.string().uuid()).max(60),
});

export const experienceSnapshotSchema = z.object({
  company: z.string().trim().min(1).max(160),
  fullCompany: z.string().trim().min(1).max(240),
  role: z.string().trim().min(1).max(200),
  period: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(3000),
  sortOrder: z.number().int().min(0).max(10000),
  publicationState: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  details: z.array(z.string().trim().min(1).max(1000)).max(40),
  technologyIds: z.array(z.string().uuid()).max(60),
});

export const skillGroupSnapshotSchema = z.object({
  label: z.string().trim().min(1).max(120),
  icon: z.string().trim().min(1).max(80),
  sortOrder: z.number().int().min(0).max(10000),
  technologies: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(1).max(120),
      }),
    )
    .min(1)
    .max(80),
});

export const siteSettingsSnapshotSchema = z.object({
  siteName: z.string().trim().min(1).max(160),
  logoText: z.string().trim().max(120).nullable(),
  footerText: z.string().trim().max(500).nullable(),
  seoTitle: z.string().trim().min(1).max(200),
  seoDescription: z.string().trim().min(1).max(500),
  defaultTabId: nullableUuid,
  displayOptions: z.record(z.string(), z.unknown()),
});

export const contentEntityTypeSchema = z.enum([
  "Profile",
  "Project",
  "Experience",
  "SkillGroup",
  "SiteSettings",
]);

export const saveContentDraftSchema = z.discriminatedUnion("entityType", [
  z.object({
    entityType: z.literal("Profile"),
    entityId: z.string().uuid(),
    expectedVersion: z.number().int().min(0),
    snapshot: profileSnapshotSchema,
  }),
  z.object({
    entityType: z.literal("Project"),
    entityId: z.string().uuid().optional(),
    expectedVersion: z.number().int().min(0),
    snapshot: projectSnapshotSchema,
  }),
  z.object({
    entityType: z.literal("Experience"),
    entityId: z.string().uuid().optional(),
    expectedVersion: z.number().int().min(0),
    snapshot: experienceSnapshotSchema,
  }),
  z.object({
    entityType: z.literal("SkillGroup"),
    entityId: z.string().uuid().optional(),
    expectedVersion: z.number().int().min(0),
    snapshot: skillGroupSnapshotSchema,
  }),
  z.object({
    entityType: z.literal("SiteSettings"),
    entityId: z.string().uuid(),
    expectedVersion: z.number().int().min(0),
    snapshot: siteSettingsSnapshotSchema,
  }),
]);

export type SaveContentDraftInput = z.infer<typeof saveContentDraftSchema>;

export const saveNavigationDraftSchema = z.discriminatedUnion("entityType", [
  z.object({
    entityType: z.literal("NavigationGroup"),
    entityId: z.string().uuid().optional(),
    expectedVersion: z.number().int().min(0),
    snapshot: navigationGroupSnapshotSchema,
  }),
  z.object({
    entityType: z.literal("PortfolioTab"),
    entityId: z.string().uuid().optional(),
    expectedVersion: z.number().int().min(0),
    snapshot: portfolioTabSnapshotSchema,
  }),
]);

export type SaveNavigationDraftInput = z.infer<
  typeof saveNavigationDraftSchema
>;

export const publishNavigationSchema = z.object({
  revisions: z
    .array(
      z.object({
        entityType: z.enum([
          "NavigationGroup",
          "PortfolioTab",
          "Profile",
          "Project",
          "Experience",
          "SkillGroup",
          "SiteSettings",
        ]),
        entityId: z.string().uuid(),
        version: z.number().int().positive(),
      }),
    )
    .min(1)
    .max(50),
});
