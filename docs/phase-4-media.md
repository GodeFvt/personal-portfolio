# Phase 4 — Media

## Implemented workflow

- One storage interface provides `upload`, `read`, `readBuffer`, `stat`, and `delete` operations for local disk and private Vercel Blob.
- Local objects live outside `public/`, use generated UUID paths, and reject any path that escapes the configured storage directory.
- Vercel uploads use short-lived client-upload tokens. The token-generation request rechecks the current admin session, `media.write`, Origin/CSRF, the pending reservation, pathname, MIME type, and size. The completion callback carries a separately signed reservation grant.
- Upload reservations begin as `PENDING` and `PRIVATE`. Completion reads the stored object, checks its real signature, declared MIME type, exact size, and image dimensions, then moves it to `READY`. Failed verification deletes the stored object and records `FAILED`.
- Supported files are JPEG, PNG, and WebP up to 5 MB, and PDF up to 10 MB. SVG, HTML, MIME spoofing, oversized files, and mismatched completion data are rejected.
- Completion is idempotent, so a Vercel callback and the browser's completion confirmation can safely arrive more than once.

## Admin and publishing

- `/admin/media` lists assets, previews authenticated private content, edits alt text and visibility with optimistic version checks, shows reference totals, and prevents deletion while an asset is referenced.
- The reusable media picker is connected to Profile portrait/resume, Project cover, and custom-page image blocks. A replacement uploads a new object and selects its new ID; it never overwrites the old object.
- Drafts can reference verified private media, but `/api/media/:id` continues to return 404. Transactional publish checks every referenced asset is `READY` and marks only the published references `PUBLIC`.
- The public route still requires `READY` + `PUBLIC` plus a live published Profile, Project, or visible published page-block reference. Knowing an asset UUID is not sufficient.
- Deletion checks published records, blocks, and unpublished revisions. Orphan cleanup removes unreferenced pending/failed/deleting or ready/private assets only after a 24-hour grace period, up to 100 records per run.
- Cleanup can be started by an authorized admin or by `POST /api/jobs/media-cleanup` with `Authorization: Bearer $SCHEDULED_JOB_SECRET`.

## Environment

`STORAGE_PROVIDER=local` uses `LOCAL_STORAGE_DIR`. `STORAGE_PROVIDER=vercel-blob` uses Vercel project OIDC or `BLOB_READ_WRITE_TOKEN`; `BLOB_STORE_ID` identifies the private store when required. Upload grants use `MEDIA_UPLOAD_SECRET`, falling back to `NUXT_SESSION_PASSWORD`. Every environment must use independent secrets and storage.

## Verification performed

- Unit tests cover per-type limits, PNG signature/dimensions, MIME spoofing rejection, signed upload-grant scope/tampering, and local path containment.
- An isolated PostgreSQL 17 database and local storage completed browser login → JPEG upload → private draft → public 404 → publish → public JPEG 200.
- The same isolated flow uploaded and published the real resume PDF; the public route returned `application/pdf` with the expected bytes.
- A `.png` containing plain text was reserved and uploaded, then rejected during completion; it never appeared as a ready asset.
- The Media library showed the published Profile reference and disabled deletion. The public hero and sidebar both resolved the published portrait through `/api/media/:id`.
- Admin and public pages rendered without an error overlay or browser console errors. Typecheck, production build, and the existing content/access/OAuth tests passed.
- The private Vercel Blob direct-upload path is implemented against `@vercel/blob` 2.8.0 and passes typecheck/build. A real Preview write is intentionally left for the Phase 5 environment smoke check so this implementation task does not mutate a connected cloud store without a release/deployment request.

