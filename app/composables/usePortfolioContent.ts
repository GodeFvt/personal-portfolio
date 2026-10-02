import { stringValue, objectValue } from "~/lib/values";
import type { ComputedRef } from "vue";
import type {
  PortfolioApiData,
  PublicProfile,
  SiteApiData,
} from "~~/shared/types/portfolio-api";

export function usePortfolioContent(
  responseData: ComputedRef<PortfolioApiData | null>,
  site: ComputedRef<SiteApiData | null>,
) {
  const profile = usePortfolioProfile(responseData, site);
  const projects = computed(
    () =>
      responseData.value?.content.projects ?? responseData.value?.items ?? [],
  );
  const displayedProjects = computed(() => projects.value);
  const archive = computed(() => responseData.value?.content.archive ?? []);
  const experience = computed(
    () => responseData.value?.content.experience ?? [],
  );
  const skillGroups = computed(
    () => responseData.value?.content.skillGroups ?? [],
  );
  function blockProps(variant?: string, type?: string) {
    const block = responseData.value?.blocks.find((item) => {
      if (type && item.type !== type) return false;
      return variant ? item.props.variant === variant : true;
    });
    return block?.props ?? {};
  }
  const pageHeading = computed(() => {
    const props = blockProps("heading", "text");
    return {
      kicker: stringValue(props.kicker),
      heading: stringValue(props.heading),
      description: stringValue(props.content || props.description),
    };
  });
  const introductionHero = computed(() => {
    const props = blockProps("hero", "text");
    const primaryAction = objectValue(props.primaryAction);
    const secondaryAction = objectValue(props.secondaryAction);
    return {
      kicker: stringValue(props.kicker),
      heading: stringValue(props.heading),
      description: stringValue(props.description),
      primaryAction: stringValue(primaryAction.label),
      secondaryAction: stringValue(secondaryAction.label),
      primarySlug: stringValue(primaryAction.tabSlug),
      secondarySlug: stringValue(secondaryAction.tabSlug),
      fullName: stringValue(props.fullName),
      roleLabel: stringValue(props.roleLabel),
    };
  });
  const introductionHeadingLines = computed(() => {
    const heading = introductionHero.value.heading.trim();
    if (heading === "A little human. A lot of backend.") {
      return ["A little human.", "A lot of backend."];
    }
    return [heading];
  });
  const introductionOrigin = computed(() => {
    const props = blockProps("origin", "text");
    return {
      kicker: stringValue(props.kicker),
      heading: stringValue(props.heading),
      description: stringValue(props.content),
    };
  });
  const introductionFocus = computed(() => {
    const props = blockProps("focus-strip", "skill-group");
    return {
      heading: stringValue(props.heading),
      items: Array.isArray(props.items)
        ? props.items.filter((item): item is string => typeof item === "string")
        : [],
    };
  });
  const introductionProjectsHeading = computed(() => {
    const props = blockProps(undefined, "project-grid");
    const heading =
      props.heading &&
      typeof props.heading === "object" &&
      !Array.isArray(props.heading)
        ? (props.heading as Record<string, unknown>)
        : {};
    return {
      heading: stringValue(heading.heading),
      description: stringValue(heading.description),
    };
  });
  const contactSignoff = computed(() =>
    stringValue(blockProps("signoff", "text").content),
  );
  const linkListContent = computed(() => {
    const props = blockProps(undefined, "link-list");
    const rawLinks = Array.isArray(props.links) ? props.links : [];
    return {
      heading: stringValue(props.heading),
      links: rawLinks
        .map(objectValue)
        .map((link) => ({
          label: stringValue(link.label),
          url: stringValue(link.url),
          description: stringValue(link.description),
        }))
        .filter((link) => link.label && link.url),
    };
  });
  const contactSocialLinks = computed(() =>
    linkListContent.value.links.filter(
      (link) => !link.url.startsWith("mailto:"),
    ),
  );

  return {
    profile,
    projects,
    displayedProjects,
    archive,
    experience,
    skillGroups,
    pageHeading,
    introductionHero,
    introductionHeadingLines,
    introductionOrigin,
    introductionFocus,
    introductionProjectsHeading,
    contactSignoff,
    linkListContent,
    contactSocialLinks,
  };
}
