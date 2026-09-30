export default defineNuxtConfig({
  compatibilityDate: "2026-09-30",
  modules: ["@nuxt/ui", "@pinia/nuxt", "nuxt-auth-utils"],
  css: ["~/assets/css/main.css", "~/assets/css/admin.css"],
  devtools: { enabled: false },
  nitro: { compressPublicAssets: true },
  routeRules: {
    "/images/**": { headers: { "cache-control": "public, max-age=86400" } },
  },
  colorMode: { preference: "system", fallback: "dark", classSuffix: "" },
  app: {
    head: {
      htmlAttrs: { lang: "en" },
      link: [{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
    },
  },
  typescript: { strict: true },
  runtimeConfig: {
    session: {
      maxAge: 60 * 60 * 8,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    },
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    },
  },
});
