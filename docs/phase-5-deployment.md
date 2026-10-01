# Phase 5 — deployment and handoff

Phase 5 turns the portfolio into a reproducible release rather than adding a new visual surface.

## Automated verification

`npm run test:phase5` creates an isolated PostgreSQL 17 container and proves the following on a fresh database:

- every migration applies, seed is idempotent, and the portrait/résumé import succeeds with local storage;
- real PostgreSQL publication transactions roll back atomically and reject stale versions;
- public pagination and published-only visibility work through HTTP;
- server authorization remains required when frontend guards are bypassed;
- same-origin/CSRF checks, session logout/revocation, private media, and session/user-scoped upload tokens are enforced;
- a custom-format PostgreSQL backup restores into a new database with the expected records;
- the dedicated production image builds, starts as the non-root runtime user, becomes healthy, and serves `/api/site` through Nginx/TLS.

Focused suites cover delegation, protected Owner changes, serializable retry behavior, OAuth state replay/expiry, PKCE request construction, invitation email rules, encrypted secret rotation, MIME spoofing, size limits, storage traversal, and upload-token tampering/expiry.

The browser release pass covers initial auto-fetch, refresh, dynamic endpoint navigation, request cancellation/slow-response protection, draft/publish administration, and desktop/mobile layouts. Preview and Production smoke checks cover `/`, `/api/site`, `/admin/login`, `/admin/media`, and representative portfolio endpoints.

## Provider status

Google and GitHub were live-tested in Phase 3 through the configured draft → test → activate flow. Microsoft remains disabled because no Microsoft test credentials are configured; it is not represented as live-verified. Automated adapter tests still require state, PKCE, nonce, issuer/audience/tenant validation paths, verified email rules, single-use invitations, and session revocation on provider changes. A future Microsoft activation must complete the same live test before the UI permits activation.

## Operations

- Vercel environment and Git release process: `docs/vercel-release.md`
- Ubuntu, HTTPS, health checks, backup and restore: `docs/ubuntu-production.md`
- Production Compose template: `compose.prod.yml`
- Development/production images: `Dockerfile.dev` and `Dockerfile.prod`
- Nginx TLS proxy template: `ops/nginx/default.conf.template`
- Secret-free environment template: `ops/production.env.example`

Secrets are not written to logs, client data, images, or the repository. OAuth encryption keys must be backed up separately from the database; restoring only the database is insufficient for provider login recovery.

`npm audit --omit=dev` still reports the `deepmerge-ts <8` advisory through Prisma's configuration package. The vulnerable merge path is used by the trusted operator/build configuration, not visitor input or the deployed Nitro request path. npm's proposed automatic fix downgrades Prisma across a breaking major boundary, so the release keeps Prisma 7.10.0 and records this as an upstream CLI/build-time exception until Prisma ships a compatible stable update. The separately reported `mysql2` advisories are remediated with the 3.24.x override.
