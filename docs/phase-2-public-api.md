# Phase 2 — Public API and dynamic frontend

## Public routes

| Route | Behavior |
| --- | --- |
| `GET /api/site` | Published branding, profile, navigation groups/tabs, and resolved default tab |
| `GET /api/portfolio/:slug` | Published tab by current slug or alias; response shape follows its template |
| `GET /api/projects/:slug` | Published, non-archived project detail |
| `GET /api/media/:id` | Streams only ready/public media referenced by published content |

All routes use the shared `{ data }` envelope. Errors use `{ data: null, error, meta.requestId }`. Project-list tabs accept `page`, `perPage`, `search`, and `category=all|backend|fullstack`; page numbering starts at 1 and `perPage` is capped at 50.

## Published-only rules

- A hidden or archived navigation group hides all child tabs from both `/api/site` and direct tab requests.
- A tab must be published; an old alias resolves to the current published record.
- Project detail excludes archived and draft projects.
- Media requires `READY` + `PUBLIC` and a reference from a published profile, project, or page block.
- Public responses and media currently use `Cache-Control: no-store` so unpublishing takes effect immediately.

## Frontend data flow

The page loads `/api/site` during SSR, resolves the requested/default tab from dynamic navigation, and loads the tab response automatically. Preview and JSON read the same response ref. The Send button repeats the request, while sequence IDs and `AbortController` prevent slow earlier requests from replacing a newer tab.

The five built-in templates keep their existing visual treatment. `custom-page` renders validated text, image, link-list, project-grid, timeline, and skill-group blocks through `app/components/portfolio/BlockRenderer.vue`. No raw HTML, Vue template, or JavaScript is evaluated from database content.

## Verification performed

- Migration and seed against PostgreSQL 17 local.
- All three migrations and the idempotent seed applied to the Prisma Postgres Preview branch.
- Docker development connected to real Prisma Postgres and private Vercel Blob; page, public APIs, portrait, and resume returned 200.
- Vercel Preview and Production deployments passed the same page/API/private-media smoke checks. Production is published at `https://portfolio-phuttinan-s-projects.vercel.app`.
- SSR reflected a temporary profile value changed only in the database, then the value was restored.
- Pagination rejects invalid queries and returns empty items with real totals for out-of-range pages.
- Hidden-group test removed the group from site navigation and returned 404 for its tab; visibility was restored.
- Alias slug resolved to the canonical published tab; the temporary alias was removed.
- A temporary published custom tab and text block appeared in navigation and SSR without a code change; both records were removed.
- Typecheck and production build passed.
