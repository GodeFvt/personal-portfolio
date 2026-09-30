import { z } from "zod";
import { pageBlockPropsSchema, slugSchema } from "./content";

export const navigationGroupSnapshotSchema = z.object({
  label: z.string().trim().min(1).max(120),
  sortOrder: z.number().int().min(0).max(10000),
  visibility: z.enum(["VISIBLE", "HIDDEN", "ARCHIVED"]),
});

export const adminPageBlockSchema = z.object({
  type: z.enum(["TEXT", "IMAGE", "LINK_LIST", "PROJECT_GRID", "TIMELINE", "SKILL_GROUP"]),
  props: pageBlockPropsSchema,
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

export const publishNavigationSchema = z.object({
  revisions: z.array(z.object({
    entityType: z.enum(["NavigationGroup", "PortfolioTab"]),
    entityId: z.string().uuid(),
    version: z.number().int().positive(),
  })).min(1).max(50),
});
