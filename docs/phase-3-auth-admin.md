# Phase 3 — Authentication and Admin

## Implemented checkpoint

- `nuxt-auth-utils` sealed-cookie session with an eight-hour lifetime; the cookie stores only account/session identifiers and the server checks the database on every protected request.
- Password login with generic failures, scrypt hashing, DB-backed rate limiting, immediate session revocation, Origin + CSRF checks, and security audit events.
- Idempotent permission/system-role/provider seed plus operator-only Owner bootstrap and password reset scripts. No default password or public registration exists.
- Server-side `requireAdmin` and `requirePermission` checks. The admin route middleware is only a navigation aid and is not the security boundary.
- Admin login, overview, navigation, Users, Roles, Login methods, and Audit surfaces.
- Navigation group/custom-page draft revisions, authenticated private preview data, optimistic version checks, and transactional publish. Public APIs continue to read published records only.
- OAuth provider draft secrets use AES-256-GCM with a versioned environment keyring. Read APIs expose only `secretConfigured`; no endpoint returns plaintext secrets.

## Verified

- Invalid/anonymous login and session requests return `401` without disclosing whether an account exists.
- Missing CSRF token returns `403`.
- A temporary Owner completed login → save group draft → publish → save custom tab draft → publish; the public site and tab APIs reflected the published records without a deploy.
- Logout revoked the database session and the next protected request returned `401`.
- The temporary Owner, session, audit rows, group, tab, blocks, and revisions were removed after the integration test.

## Remaining before Phase 3 is complete

- Invitation acceptance, custom-role mutations/delegation guards, user suspension/role assignment, and last-owner concurrency tests.
- Per-request Google/Microsoft/GitHub adapters, OAuthAttempt replay protection, live test/activate flows, identity linking/unlinking, and provider session revocation.
- Profile, projects, experience, stack, settings, and full block editors with draft preview/publish.
- Bootstrap the real Owner and run live browser tests. OAuth providers remain disabled until credentials are supplied and a real round-trip passes.
