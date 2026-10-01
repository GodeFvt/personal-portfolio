# Phase 3 — Authentication and Admin

## Unified interface and themes

The public portfolio and admin now use the same brand rhythm, typography, semantic color tokens, and restrained pink accent. Both surfaces support System, Light, and Dark preferences through one shared theme control, with the choice persisted by Nuxt Color Mode. The admin information architecture is unchanged, but its hierarchy, page context, navigation, forms, and loading states are denser and easier to scan.

The interface refresh was a Phase 3 checkpoint; the security and OAuth capabilities below are separate server-enforced milestones.

## Admin loading experience

Admin routes render their working surface immediately and fetch page data lazily. A shape-matched skeleton is shown only for the initial request; existing content remains visible during a refresh. The global route progress line and restrained content fade provide navigation feedback without blocking the sidebar or replacing the entire screen.

## Implemented checkpoint

- `nuxt-auth-utils` sealed-cookie session with an eight-hour lifetime; the cookie stores only account/session identifiers and the server checks the database on every protected request.
- The PostgreSQL adapter caps each Vercel function instance at one pooled connection to avoid exhausting the database when serverless instances scale out; local/Docker development uses at most five.
- Password login with generic failures, scrypt hashing, DB-backed rate limiting, immediate session revocation, Origin + CSRF checks, and security audit events.
- Idempotent permission/system-role/provider seed plus operator-only Owner bootstrap and password reset scripts. No default password or public registration exists.
- Server-side `requireAdmin` and `requirePermission` checks. The admin route middleware is only a navigation aid and is not the security boundary.
- Admin login, overview, navigation, Users, Roles, Login methods, and Audit surfaces.
- Navigation group/custom-page draft revisions, authenticated private preview data, optimistic version checks, and transactional publish. Public APIs continue to read published records only.
- OAuth provider draft secrets use AES-256-GCM with a versioned environment keyring. Read APIs expose only `secretConfigured`; no endpoint returns plaintext secrets.
- Invite-only OAuth-first onboarding with single-use expiring links, exact verified-email matching, passwordless accounts, revocation, custom-role create/update/delete, permission-subset delegation guards, user suspension/role assignment, and serializable last-active-Owner protection.
- Per-request Google, Microsoft, and GitHub authorization-code adapters with PKCE, state replay protection, OIDC nonce/signature/issuer/audience checks, tested-draft activation, explicit identity link/unlink, re-authentication, and provider session revocation.
- Every active administrator has a self-service My login methods page, independent of provider-management permissions, while provider credentials remain restricted to authorized administrators.

## Verified

- Invalid/anonymous login and session requests return `401` without disclosing whether an account exists.
- Missing CSRF token returns `403`.
- A temporary Owner completed login → save group draft → publish → save custom tab draft → publish; the public site and tab APIs reflected the published records without a deploy.
- Logout revoked the database session and the next protected request returned `401`.
- The temporary Owner, session, audit rows, group, tab, blocks, and revisions were removed after the integration test.

## Remaining before Phase 3 is complete

- Profile, projects, experience, stack, settings, and full block editors with draft preview/publish.
- Complete live browser checks for each configured provider. A provider remains unavailable to invitations and login until credentials complete a real test → activate round-trip.
