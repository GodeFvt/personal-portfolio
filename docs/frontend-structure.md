# Frontend structure

The `/` route stays in `app/pages/index.vue`. It loads the initial SSR data and
composes the workspace; individual portfolio views belong in
`app/components/workspace/`.

## Portfolio

- `Header`, `Sidebar`, and `RequestControls` render workspace navigation and controls.
- `Introduction`, `Projects`, `Experience`, `Stack`, and `Contact` render public tabs.
- `Preview` owns content projections and tab-local selections, including the
  selected job and technology stack.
- `ProjectDialog` renders project details using the native dialog element.
- `usePortfolioNavigation` owns the selected endpoint and project request URL.
- `usePortfolioContent` maps API content and blocks to view data.
- `usePortfolioProfile` maps profile data shared by navigation and public content.
- `usePortfolioProjectDialog` owns project-detail loading and dialog state.
- `usePortfolioClipboard` owns copying and temporary feedback.
- `usePortfolioWorkspace` coordinates requests, cache/history, prefetching,
  keyboard shortcuts, and lifecycle cleanup. Its page-facing API exposes five
  groups: `sidebar`, `request`, `preview`, `projectDialog`, and `clipboard`.
- `app/types/portfolio.ts` defines explicit component contracts. Do not derive
  `defineProps` keys from a composable's `ReturnType`: Vue's compiler cannot resolve
  those keys reliably.

Existing public CSS stays in `app/assets/css/workspace.css`. The refactor preserves
the existing DOM classes and visual design.

## API calls

`app/plugins/api.ts` provides one Axios client per Nuxt app/request. Use a feature
factory from `app/lib/api/` rather than calling Axios directly in pages:

```ts
const api = createContentApi(useNuxtApp().$api);
const { data, error, refresh } = await useApiData<ContentResponse>(
  api.pathContent,
  { key: "admin-content", lazy: true },
);

await api.saveDraft({ data: payload });
await refresh();
```

Feature modules own endpoint paths, HTTP methods, and typed mutation payloads.
`auth.ts` is shared by login, invitations, and account/security provider flows;
`admin/publication.ts` is shared by content and navigation publishing.

The common client owns credentials, CSRF headers for mutations, response metadata,
and normalized API errors. Use `apiMessage(error, fallback)` for user-facing errors.
It only accepts local `/api/` paths so the credential-bearing client cannot send
session data to external storage URLs.

`useApiData` retains Nuxt's SSR hydration, lazy loading, refresh, error state, and
cancellation while delegating requests to Axios. During SSR, `createNitroAdapter`
uses Nitro's request-scoped `event.fetch` to dispatch requests in-process and
forward session cookies. It does not call the public hostname or share cookies
between SSR requests.

Media reservation and completion use the common API client. Direct object-storage
uploads use an independent Axios request; signed storage URLs do not receive
application session/CSRF defaults. Vercel Blob uploads continue to use its required
client SDK.

## Types and shared functions

Admin Navigation owns groups, tab metadata, visibility, and deletion. Content →
Pages owns the template and blocks for every tab, including unpublished tabs.
`PagesContent` loads existing private revisions and uses `PageBlockEditor` for
text, hero/headings, images, links, project grids, timelines, technology groups,
and focus strips. Built-in layouts use their matching blocks; custom layouts
render all blocks in order. Collection blocks reuse published records from the
main Content sections. New empty tabs can copy content from an existing matching
template.

Page content and navigation saves merge their respective fields into the latest
private revision. Navigation writes cannot replace page blocks. Publication uses
the existing version checks and media validation. Tab deletion requires both
navigation editing and publication permission, verifies the current version,
rejects default tabs, removes dependent blocks/aliases/revisions, and records an
audit event. It keeps shared profile, project, experience, and stack records.
Run `npm run test:pages` for block compatibility and draft/deletion service tests.

- `app/types/admin/`: response DTOs and editor models, grouped by admin feature.
- `app/types/request-cache.ts`: request cache/history records.
- `shared/types/portfolio-api.ts`: public API contracts used by client and server.
- `shared/types/admin-api.ts`: mutation inputs inferred from shared backend schemas.
- `shared/types/serialization.ts`: JSON representations of server records.
- `app/lib/values.ts`: common safe string/object parsing.
- `app/lib/portfolio/links.ts`: portfolio link icon selection.

Keep reactive UI state in composables, pure reusable functions in `app/lib`, and
request contracts in types/schema modules. Avoid duplicating endpoints or CSRF
handling inside pages.

## Verification

```text
npm run typecheck
npm run build
npm run test:frontend
```

The frontend API tests cover SSR JSON/query serialization, response headers/status,
server errors, changing CSRF tokens and client isolation, credential scope, and
request cancellation.
