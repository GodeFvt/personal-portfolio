# Phuttinan Workspace

A Nuxt 4 portfolio styled as an API workspace. Neutral black surfaces, restrained pink accents, and natural-color profile photos.

Current release: `v1.2.0` (Phase 3 authentication/admin foundation; Phase 3 remains in progress). Compatible performance and maintenance updates increment the `v1.x.x` line. `v2.0.0` is reserved for completion of the full backend/admin plan.

## Run

Put the Vercel Prisma Postgres and Blob credentials in the ignored `.env` file. Docker development uses those real services by default:

```sh
docker compose -f compose.dev.yml up --build app
```

Or run directly on the host:

```sh
npm install
npm run env:check
npm run db:deploy
npm run db:seed
npm run dev
npm run typecheck
npm run build
```

Open http://localhost:3000. Node 22.12+ is required. Start production with `node .output/server/index.mjs` and set `PORT` if needed. Use a Node/Nitro-capable host for the API.

Before using `/admin`, run `npm run auth:setup-local-env`, `npm run db:seed`, then set temporary `ADMIN_BOOTSTRAP_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD` environment variables and run `npm run admin:bootstrap`. The bootstrap refuses to run once an active Owner exists. See `docs/phase-3-auth-admin.md` for the implemented security boundary and remaining Phase 3 scope.

## Structure

- `app/pages/index.vue`: workspace views and interactions
- `app/assets/css/main.css`: shared base and project illustrations
- `app/assets/css/workspace.css`: neutral surfaces and workspace layout
- `app/components/workspace/`: portrait graph and project cards
- `app/components/portfolio/`: validated custom-page block renderers
- `server/services/public-content.ts`: published-only database queries
- `server/api/site.get.ts`: branding, profile, and dynamic navigation
- `server/api/portfolio/[slug].get.ts`: published tab content and pagination
- `server/api/projects/[slug].get.ts`: published project details
- `server/api/media/[id].get.ts`: permission-checked media streaming
- `prisma/schema.prisma`: PostgreSQL data model
- `prisma/seed.ts`: idempotent import source for the original portfolio data
- `public/images/profile.jpg`: original full-color photo
- `public/resume/phuttinan-resume.pdf`: current downloadable resume

The previous classic route, its archive, and unused landing-page components have been removed.

## Interactions

Navigation and tabs come from published database records. Opening the page or changing to an uncached tab fetches its API automatically. Successful responses are stored in a session Pinia cache keyed by the complete request URL; returning through navigation or Request History reuses the cached response, while Send explicitly refreshes it. After `/me` is ready, `/contact` is prefetched during browser idle time unless data saving or a slow connection is detected. This bounded prefetch does not create a History item until `/contact` is actually opened. Uncached requests show a skeleton, Preview and JSON render the same response object, and endpoint changes cancel pending requests.

Ctrl/Cmd+K searches, Ctrl/Cmd+Enter sends, arrow keys navigate response tabs, and Escape closes project details or mobile collections. Direct links such as `/?endpoint=projects` are supported. History is session-only, capped at 12 requests.

## เปลี่ยนข้อมูลและรูป

ข้อมูลที่หน้าเว็บใช้งานจริงมาจาก PostgreSQL เท่านั้น `shared/data/*` เป็น source สำหรับ seed ครั้งแรกและไม่ถูก import ใน runtime การแก้ผ่าน admin จะเริ่มใน Phase 3; ระหว่างนี้แก้ข้อมูลทดสอบผ่าน Prisma Studio ได้ และการรัน seed ซ้ำจะไม่เขียนทับ record ที่มีอยู่

ปัจจุบันภาพโปรเจกต์เป็น **concept illustration** ไม่ใช่ screenshot ของระบบจริง โดยมีคำว่า CONCEPT กำกับไว้

1. แคปหน้าจอจริงที่ความกว้าง 1440px หรือ 1600px ใช้ข้อมูลตัวอย่างและซ่อนข้อมูลส่วนบุคคล เช่น ชื่อผู้สมัคร เบอร์โทร และผลสอบ
2. บันทึกเป็น WebP หรือ PNG แนะนำขนาด 1600 × 1000px (อัตราส่วน 8:5) ไม่เกินประมาณ 300KB
3. รูปโปรไฟล์และเรซูเม่ถูกนำเข้า private Blob แล้ว และหน้าเว็บอ่านผ่าน `/api/media/:id`; อย่าใส่ private Blob URL ลงหน้าเว็บโดยตรง
4. Phase 4 จะเพิ่ม workflow อัปโหลด/ตรวจสอบ completion สำหรับไฟล์โปรเจกต์ผ่าน admin

| Project               | Suggested filename | ภาพที่แนะนำ                                                                |
| --------------------- | ------------------ | -------------------------------------------------------------------------- |
| Pre-test registration | `pretest.webp`     | หน้าสรุปการลงทะเบียนของ admin หรือหน้า flow สมัครสอบที่ใช้ข้อมูลตัวอย่าง   |
| School management     | `school.webp`      | ภาพรวมระบบ หรือ architecture diagram ที่ตรวจสอบกับ implementation จริงแล้ว |
| Kradan Kanban         | `kradan.webp`      | หน้าบอร์ดพร้อมคอลัมน์และงานตัวอย่าง                                        |

Preview และ Docker dev ใช้รูปโปรไฟล์/เรซูเม่จาก private Blob จริงแล้ว ส่วน concept illustration ของโปรเจกต์ยังคงเดิมจนกว่าจะมีไฟล์จริง

## Design and validation

Nuxt UI, Tailwind CSS 4, Nuxt Icon, Geist, and Geist Mono. Dark surfaces use equal RGB channels to prevent a pink/purple cast. Pink is reserved for selected states, controls, headings, and project illustrations. Profile photos are displayed without grayscale or color blending.

The workspace has been checked across five endpoint views and four viewport widths, including requests, failure/retry, search, filters, clipboard actions, dialogs, keyboard navigation, request cancellation, and reduced motion. Run the build and type checks after edits.
