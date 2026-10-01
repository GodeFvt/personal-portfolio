# Vercel environment and release guide

The Git repository is the release source of truth. A `codex/*` branch produces a Preview deployment and `main` produces Production. Do not use `vercel --prod` while the Git integration is healthy.

## Environment separation

Configure Development, Preview, and Production separately in Vercel. Preview must use its own PostgreSQL database/schema and Blob store; never point Preview migrations, seed, OAuth credentials, or uploads at Production.

Required server values:

- `DATABASE_URL`: pooled runtime PostgreSQL URL.
- `DIRECT_URL`: direct PostgreSQL URL used only by the controlled migration step.
- `NUXT_SESSION_PASSWORD`, `MEDIA_UPLOAD_SECRET`, and `SCHEDULED_JOB_SECRET`: independent random values of at least 32 characters.
- `NUXT_PUBLIC_SITE_URL`: canonical HTTPS origin for that environment.
- `OAUTH_SECRET_KEYS` and `OAUTH_ACTIVE_KEY_VERSION`: backed up separately from the database.
- `STORAGE_PROVIDER=vercel-blob` and either the connected store OIDC configuration or `BLOB_READ_WRITE_TOKEN` for operator scripts outside Vercel.

The project runs in `sin1`; keep the primary database close to that region and use a pooled runtime connection. The build runs `prisma generate`; it does not run migrations or seed automatically.

## Controlled release

1. Validate environment shape with `npm run env:check` without printing values.
2. Run `npm run db:deploy` once against the target direct connection before switching traffic. Migrations are additive and must remain compatible with the previous app during rollout.
3. Run seed or media import only when explicitly needed; both are operator actions, not build hooks.
4. Push a `codex/*` branch, wait for Preview to become Ready, and smoke-check `/`, `/api/site`, `/admin/login`, and the changed route.
5. Merge the verified branch into `main`, create the annotated release tag, and wait for Production to become Ready.
6. Confirm `phuttinan.dev` is attached to that deployment and repeat the smoke checks.

OAuth callback URLs are `${NUXT_PUBLIC_SITE_URL}/api/auth/oauth/{provider}/callback`. Register the exact Preview callback only in isolated test clients. Production clients must use the production origin. Provider changes follow draft → live test → activate; disabling or replacing an active config revokes sessions created by that provider.

Rollback the app by reverting/rolling back to the previous Git deployment. Do not roll a migration backward blindly: restore from a verified backup only for disaster recovery, otherwise ship a forward-fix migration.
