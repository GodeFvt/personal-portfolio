import type { ComputedRef } from "vue";
import type {
  PublicProfile,
  PortfolioApiData,
  SiteApiData,
} from "~~/shared/types/portfolio-api";

export function usePortfolioProfile(
  responseData: ComputedRef<PortfolioApiData | null>,
  site: ComputedRef<SiteApiData | null>,
) {
  const emptyProfile: PublicProfile = {
    name: "",
    alias: "",
    role: "",
    email: "",
    bio: "",
    focus: "",
    interests: [],
    location: "",
    portraitUrl: null,
    resumeUrl: null,
    education: [],
    socialLinks: [],
  };
  const profile = computed(() => {
    const value =
      responseData.value?.content.profile ??
      site.value?.profile ??
      emptyProfile;
    const social = (type: string) =>
      value.socialLinks.find((link) => link.type === type)?.url ?? "";
    return {
      ...value,
      github: social("github"),
      linkedin: social("linkedin"),
      resume: value.resumeUrl ?? social("resume"),
      portrait: value.portraitUrl,
    };
  });
  return profile;
}
