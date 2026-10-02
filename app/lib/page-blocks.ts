import { adminPageBlockSchema } from "../../shared/schemas/admin-content";
import type { z } from "zod";
import { objectValue, stringValue } from "./values";
export type PageBlock = z.infer<typeof adminPageBlockSchema>;
export interface PageBlockEditor {
  type: PageBlock["type"];
  original: Record<string, unknown>;
  variant: string;
  content: string;
  kicker: string;
  heading: string;
  description: string;
  fullName: string;
  roleLabel: string;
  primaryLabel: string;
  primarySlug: string;
  secondaryLabel: string;
  secondarySlug: string;
  mediaId: string | null;
  alt: string;
  linksText: string;
  itemsText: string;
  featuredOnly: boolean;
  includeArchived: boolean;
}
export function pageBlockEditor(
  type: PageBlock["type"],
  original: Record<string, unknown> = {},
): PageBlockEditor {
  const heading = objectValue(original.heading);
  const primary = objectValue(original.primaryAction);
  const secondary = objectValue(original.secondaryAction);
  return {
    type,
    original,
    variant: stringValue(original.variant),
    content: stringValue(original.content),
    kicker: stringValue(original.kicker || heading.kicker),
    heading: stringValue(
      typeof original.heading === "string" ? original.heading : heading.heading,
    ),
    description: stringValue(original.description || heading.description),
    fullName: stringValue(original.fullName),
    roleLabel: stringValue(original.roleLabel),
    primaryLabel: stringValue(primary.label),
    primarySlug: stringValue(primary.tabSlug),
    secondaryLabel: stringValue(secondary.label),
    secondarySlug: stringValue(secondary.tabSlug),
    mediaId: stringValue(original.mediaId) || null,
    alt: stringValue(original.alt),
    linksText: Array.isArray(original.links)
      ? original.links
          .map(objectValue)
          .map((link) =>
            [
              link.label,
              link.url,
              link.description ?? "",
              link.year ?? "",
            ].join(" | "),
          )
          .join("\n")
      : "",
    itemsText: Array.isArray(original.items) ? original.items.join("\n") : "",
    featuredOnly: original.featuredOnly === true,
    includeArchived: original.includeArchived === true,
  };
}
export function serializePageBlock(block: PageBlockEditor): PageBlock {
  const props: Record<string, unknown> = {
    ...block.original,
    type: block.type.toLowerCase().replaceAll("_", "-"),
  };
  if (block.type === "TEXT")
    Object.assign(props, {
      variant: block.variant || undefined,
      content: block.content,
      kicker: block.kicker,
      heading: block.heading,
      description: block.description,
      fullName: block.fullName,
      roleLabel: block.roleLabel,
      primaryAction: block.primaryLabel
        ? { label: block.primaryLabel, tabSlug: block.primarySlug }
        : undefined,
      secondaryAction: block.secondaryLabel
        ? { label: block.secondaryLabel, tabSlug: block.secondarySlug }
        : undefined,
    });
  else if (block.type === "IMAGE")
    Object.assign(props, { mediaId: block.mediaId, alt: block.alt });
  else if (block.type === "LINK_LIST")
    Object.assign(props, {
      heading: block.heading,
      links: block.linksText
        .split("\n")
        .map((row) => row.trim())
        .filter(Boolean)
        .map((row) => {
          const [label = "", url = "", description = "", year = ""] = row
            .split("|")
            .map((value) => value.trim());
          return { label, url, description, ...(year ? { year } : {}) };
        }),
    });
  else if (block.variant === "focus-strip")
    Object.assign(props, {
      variant: block.variant,
      heading: block.heading,
      items: block.itemsText
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean),
    });
  else
    Object.assign(props, {
      variant: undefined,
      items: undefined,
      heading: block.heading
        ? {
            kicker: block.kicker,
            heading: block.heading,
            description: block.description,
          }
        : undefined,
      ...(block.type === "PROJECT_GRID"
        ? {
            featuredOnly: block.featuredOnly,
            includeArchived: block.includeArchived,
          }
        : {}),
    });
  return adminPageBlockSchema.parse({ type: block.type, props });
}
