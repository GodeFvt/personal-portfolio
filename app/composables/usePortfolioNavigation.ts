import type { Ref } from "vue";
import type { SiteApiData, ApiEnvelope } from "~~/shared/types/portfolio-api";

export function usePortfolioNavigation(
  siteResponse: Ref<ApiEnvelope<SiteApiData> | null | undefined>,
) {
  const route = useRoute();
  const router = useRouter();
  const site = computed(() => siteResponse.value?.data ?? null);
  const endpoints = computed(() =>
    (site.value?.groups ?? []).flatMap((group) =>
      group.tabs.map((tab) => ({ ...tab, group: group.label })),
    ),
  );
  const activeId = computed(() => {
    const requested =
      typeof route.query.endpoint === "string" ? route.query.endpoint : "";
    if (endpoints.value.some((endpoint) => endpoint.slug === requested))
      return requested;
    return site.value?.defaultTabSlug ?? endpoints.value[0]?.slug ?? "";
  });
  const activeEndpoint = computed(() =>
    endpoints.value.find((endpoint) => endpoint.slug === activeId.value),
  );
  const projectFilter = ref("All projects");
  const requestUrl = computed(() => {
    const path = `/api/portfolio/${encodeURIComponent(activeId.value)}`;
    if (activeEndpoint.value?.template !== "project-list") return path;
    const category =
      projectFilter.value === "Backend"
        ? "backend"
        : projectFilter.value === "Fullstack"
          ? "fullstack"
          : "all";
    return `${path}?page=1&perPage=50&category=${category}`;
  });

  return {
    route,
    router,
    site,
    endpoints,
    activeId,
    activeEndpoint,
    projectFilter,
    requestUrl,
  };
}
