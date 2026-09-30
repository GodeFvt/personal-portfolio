# Phase 1 — Foundation and data migration

## Environment mapping

All database and Blob credentials are server-only. Never place them under `runtimeConfig.public` or commit them to Git.

| Purpose | Preferred variable | Accepted fallback | Source |
| --- | --- | --- | --- |
| Application database traffic | `DATABASE_URL` | `POSTGRES_URL`, then `PRISMA_DATABASE_URL` | Vercel Prisma integration / PostgreSQL provider |
| Migrations and admin tooling | `DIRECT_URL` | Resolved application database URL | Prisma Console direct connection |
| Private Blob outside Vercel | `BLOB_READ_WRITE_TOKEN` | none | Connected Vercel Blob store |
| Private Blob on Vercel | project OIDC connection | `BLOB_READ_WRITE_TOKEN` | Connected Vercel Blob store |

`DATABASE_URL` is the canonical name used by the current Vercel Prisma Postgres integration. The other two names remain accepted so an existing Vercel configuration can be used during migration. Prefer adding `DIRECT_URL` before running production migrations.

## Local development

The default Docker development mode uses the real connected Prisma Postgres database and Vercel Blob store. Put `POSTGRES_URL` (or another supported database URL), `PRISMA_DATABASE_URL`, `BLOB_STORE_ID`, and `BLOB_READ_WRITE_TOKEN` in the ignored `.env` file, then run:

```sh
docker compose -f compose.dev.yml up --build app
```

Open `http://localhost:3000`. The local container deliberately clears Vercel deployment markers and authenticates Blob with `BLOB_READ_WRITE_TOKEN`. The optional local PostgreSQL service remains available through the `local-db` Compose profile but is not started by the cloud-backed development command.

## Vercel environment setup

The local checkout is linked to Vercel project `phuttinan-s-projects/portfolio`. Prisma Postgres `my-prisma-postgres` and private Blob store `my-store` are connected. Preview branch `portfolio-v2` has branch-scoped `STORAGE_PROVIDER=vercel-blob` and `BLOB_READ_WRITE_TOKEN`; the latter is needed because this deployment did not expose Blob OIDC to the Nuxt function runtime.

Required now for database migration and seed:

- `DATABASE_URL` (preferred), or one of the supported database aliases.
- `DIRECT_URL` is strongly recommended for migrations.

Required for the current private media reader and seed import:

- `BLOB_READ_WRITE_TOKEN` for local/Docker use, or the connected store's OIDC configuration on Vercel.

Validate names without printing secret values with `npm run env:check`.

## Seed scope

The seed migrates the current profile, education, social links, navigation groups, tabs, selected projects, archived projects, experience, skill groups, technologies, and the text currently embedded in `app/pages/index.vue`. It uses upserts with empty update clauses so rerunning it does not overwrite content changed later through the admin.

## Media import

Run `npm run media:dry-run` to validate file existence, size, JPEG/PDF signatures, checksums, and stable media IDs/storage keys without writing. `npm run media:import:preview` uploads the portrait and resume as private objects under `preview/`, upserts `MediaAsset` rows, and links them to the profile. It is safe to rerun. The admin upload/completion workflow remains Phase 4 scope.

## Dependency audit note

Prisma ORM 7.10.0 is pinned because Prisma ORM 8 is still a release candidate. The current Prisma CLI dependency tree reports high-severity advisories through `@prisma/config` (`deepmerge-ts` and the unused MySQL CLI dependency `mysql2`). `npm audit fix --force` proposes a breaking downgrade to Prisma 6 and is intentionally not applied. The application uses the PostgreSQL adapter only. Recheck the advisories before each phase and upgrade to a patched stable Prisma release when available.
