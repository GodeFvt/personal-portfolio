export default defineNuxtConfig({
  compatibilityDate: "2026-09-30",
  modules: ["@nuxt/ui", "@pinia/nuxt"],
  css: ["~/assets/css/main.css"],
  devtools: { enabled: false },
  nitro: { compressPublicAssets: true },
  routeRules: {
    "/images/**": { headers: { "cache-control": "public, max-age=86400" } },
  },
  colorMode: { preference: "dark", fallback: "dark" },
  app: {
    head: {
      htmlAttrs: { lang: "en" },
      link: [{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
    },
  },
  typescript: { strict: true },
});
