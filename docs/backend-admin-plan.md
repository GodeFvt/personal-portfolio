# แผนพัฒนา Portfolio Backend & Admin

วันที่: 1 ตุลาคม 2026
สถานะ: Phase 1–3 ทำเสร็จแล้ว โดย auth/RBAC, invite-only OAuth onboarding, provider test/activate gate, content/navigation/block editors, private draft preview, transactional publish และ unified Admin/Portfolio UI พร้อม System/Light/Dark theme ทำงานครบ; Google และ GitHub ผ่าน live browser round-trip ใน environment ที่ตั้งค่า ส่วน Microsoft ยังไม่ถูกตั้งค่าและจึงปิดอยู่ตาม gate เดิม; update ที่เข้ากันได้จะอยู่ใน `v1.x.x` และสงวน `v2.0.0` ไว้หลังทำครบทุกเฟส

## 1. เป้าหมาย

เปลี่ยนเว็บ Portfolio ปัจจุบันให้เป็น Nuxt fullstack ที่จัดการเนื้อหาและการแสดงผลผ่าน `/admin` ได้ ข้อมูลที่เผยแพร่ทั้งหมดมาจากฐานข้อมูลผ่าน API จริง เปิดเว็บหรือเปลี่ยนแท็บแล้วโหลดเอง ปุ่ม Send ใช้เรียกซ้ำ ส่วน Preview และ JSON แสดงข้อมูลจาก response เดียวกัน

คงหน้าตา API workspace สีดำเข้ม/ชมพู รูปโปรไฟล์สีจริง และไม่มี `/classic` ตามเดิม

คำว่า “ทุกอย่างจาก DB” ในแผนนี้หมายถึงเนื้อหาเว็บ รูปที่เลือกใช้ เมนู กลุ่ม แท็บ ลำดับ การเปิดเผย SEO และตัวเลือกการจัดวาง ส่วน Vue components, CSS, validation และสิทธิ์การเข้าถึงยังอยู่ในโค้ด เพื่อให้รูปแบบและการทำงานคาดเดาได้

## 2. สิ่งที่พบในโครงการปัจจุบัน

- `shared/data/portfolio.ts` เก็บ profile, projects, experience และ skill groups
- `shared/data/workspace.ts` เก็บรายการ endpoint และข้อมูลตอบกลับแบบคงที่
- `app/pages/index.vue` อ่านไฟล์ข้อมูลโดยตรง มีชื่อกลุ่มและชนิดแท็บผูกกับโค้ด
- `server/api/portfolio/[endpoint].get.ts` มี API จริงแล้ว แต่คืนข้อมูลจากไฟล์ ไม่ใช่ DB และยังไม่มี response envelope
- Preview ไม่ได้เปลี่ยนตามผล API ทุกส่วน และ JSON มี fallback ไปยังข้อมูลในไฟล์
- ใช้ Nuxt 4, Nuxt UI และ Tailwind อยู่แล้ว ยังไม่มี DB, auth หรือ admin
- จากภาพที่แนบ: มี `my-prisma-postgres` และ Private Blob store `my-store` โดยภาพยังแสดง Connect Project ต้องตรวจการเชื่อมจริงตอนเริ่มตั้งค่า

## 3. เทคโนโลยีและสภาพแวดล้อม

| ส่วน | แนวทาง |
| --- | --- |
| Frontend / backend | Nuxt 4 + Nitro ในโครงการเดียว ใช้ Node runtime |
| Admin UI | Nuxt UI + Tailwind ตามของเดิม |
| Login | `nuxt-auth-utils`: email/password + OAuth provider registry สำหรับ Google, Microsoft, GitHub พร้อม RBAC ตั้งแต่รอบแรก |
| Database production | Prisma Postgres ที่สร้างผ่าน Vercel Marketplace |
| ORM / migration | Prisma ORM, PostgreSQL driver ที่รองรับรุ่นที่เลือก และ migration แบบมี version |
| Files production | Vercel Blob แบบ Private ตาม store ที่มี |
| Validation | schema ฝั่ง server และ reuse ชนิดข้อมูลกับ admin เช่น Zod |
| Deploy หลัก | Vercel Nuxt deployment |
| Deploy สำรอง | Docker บน Ubuntu + reverse proxy HTTPS |
| Development | Docker Compose: Nuxt dev + PostgreSQL + local file volume |

ใช้แพ็กเกจจาก Nuxt ecosystem ก่อน ส่วน Prisma และ Vercel Blob ใช้ SDK ของผู้ให้บริการ เพราะทำหน้าที่เชื่อม DB/storage โดยตรง ไม่เพิ่ม frontend framework อื่น

ใช้ pooled connection สำหรับ application traffic และ direct connection สำหรับ migrations/backup ตาม [Prisma Postgres connection guide](https://www.prisma.io/docs/postgres/database/connecting-to-your-database) โดยตรวจชื่อ environment variables ที่ integration สร้างจริงก่อน map เข้าระบบ

## 4. Admin ที่จะทำ

| หน้า | ความสามารถ |
| --- | --- |
| `/admin/login` | เข้าสู่ระบบและแสดงข้อผิดพลาดแบบไม่เปิดเผยว่ามีบัญชีหรือไม่ |
| `/admin` | สรุปเนื้อหา สถานะ draft/published และรายการแก้ไขล่าสุด |
| `/admin/navigation` | เพิ่ม/แก้ไข/ซ่อน/จัดลำดับกลุ่มและแท็บ ย้ายแท็บข้ามกลุ่ม |
| `/admin/pages` | จัดเนื้อหาแต่ละแท็บ เลือก template และเรียง section blocks |
| `/admin/profile` | ชื่อ ตำแหน่ง intro, about, education, contact และ social links |
| `/admin/projects` | จัดการผลงาน stack รูป ลิงก์ highlights และ featured |
| `/admin/experience` | จัดการประสบการณ์ รายละเอียด ช่วงเวลาและเทคโนโลยี |
| `/admin/stack` | จัดกลุ่มทักษะและรายการเทคโนโลยี |
| `/admin/media` | อัปโหลด/เลือกใช้/เปลี่ยนรูปและ PDF ใส่ alt text ดูว่าไฟล์ถูกใช้อยู่ที่ไหน |
| `/admin/settings` | ชื่อเว็บ โลโก้ ข้อความ footer, SEO, default tab และตัวเลือกการแสดงผล |
| `/admin/security/login-methods` | จัดการ password login และ OAuth providers เพิ่ม configuration, ทดสอบ, เปิด/ปิด และเรียงปุ่ม login |
| `/admin/security/users` | เชิญผู้ใช้ กำหนด roles ระงับบัญชี ดู linked identities และ revoke sessions |
| `/admin/security/roles` | สร้าง custom role และกำหนด permissions จากรายการที่ระบบรองรับ |
| `/admin/security/audit` | ดูประวัติ login, provider changes, role changes และการจัดการบัญชี |
| `/admin/account` | จัดการบัญชีตัวเอง เปลี่ยนรหัสผ่าน เชื่อม/ถอด OAuth และออกจากระบบบนอุปกรณ์อื่น |

ฟอร์มต้องมี validation, สถานะ saving, แจ้งผลสำเร็จ/ผิดพลาด และเตือนเมื่อออกจากหน้าที่มีข้อมูลยังไม่บันทึก การจัดลำดับต้องใช้ได้ทั้งลากและปุ่มขึ้น/ลงสำหรับคีย์บอร์ด

### กลุ่มและแท็บแบบ dynamic

- กลุ่มปัจจุบัน The developer / The work / Say hello เป็น seed เริ่มต้น เปลี่ยนชื่อ เพิ่ม ซ่อน และเรียงได้
- แต่ละแท็บมี UUID, slug, label, description, icon จากรายการที่รองรับ, group, sort order และสถานะเผยแพร่
- `slug` ไม่ซ้ำและใช้ใน `/api/portfolio/:slug` ส่วน id คงที่เพื่อไม่ให้ความสัมพันธ์เสียเมื่อเปลี่ยนชื่อ
- การเปลี่ยน slug ต้องแจ้งว่าลิงก์เก่าจะเปลี่ยน รองรับ alias slug เก่าที่ชี้ record เดิม และห้าม alias ชนกับ slug อื่น
- ซ่อนกลุ่มแล้วซ่อนแท็บลูกจาก public API ด้วย ไม่ใช่ซ่อนเฉพาะ sidebar
- ถ้าลบกลุ่มที่มีแท็บ ต้องย้ายแท็บออกก่อน; ค่าเริ่มต้นใช้ archive แทนการลบถาวร
- default tab ต้องเป็นแท็บที่เผยแพร่ ถ้าซ่อนหรือ archive ให้เลือกแท็บที่เผยแพร่ลำดับแรก ถ้าไม่มีให้แสดงหน้า empty state
- รับ endpoint เฉพาะข้อมูลภายในระบบ ไม่ให้กรอก URL arbitrary เพื่อให้ server proxy ไปหาเว็บไซต์อื่น

### เพิ่มแท็บได้โดยไม่แก้โค้ดอย่างไร

แยก “แท็บ” ออกจาก “Vue component”: แอดมินเลือก template ที่ระบบมี แล้วกำหนดข้อมูล/blocks ที่จะแสดง

- Templates เริ่มต้น: introduction, project-list, experience-list, skill-list, contact และ custom-page
- Custom-page ประกอบได้จาก text, image, link-list, project-grid, timeline และ skill-group
- ตั้ง heading, description, ลำดับ, visibility, layout variant และรายการข้อมูลที่อ้างอิงได้
- ตัวอย่าง: เพิ่มกลุ่ม Community → เพิ่มแท็บ Open source → เลือก project-list → เลือก projects ที่ต้องการ → preview → publish แล้วหน้าเว็บมีแท็บใหม่ทันที
- ส่วนที่เป็นภาพประกอบโปรเจกต์เดิมยังใช้ได้ หากยังไม่มี screenshot; admin เลือกภาพจริงหรือ illustration variant ได้
- ไม่รองรับการใส่ JavaScript, Vue template หรือ HTML ไม่ผ่านการกรองจาก admin; รูปแบบ component ชนิดใหม่ยังต้องพัฒนาเพิ่มหนึ่งครั้ง
- คงข้อมูลสำคัญในตารางที่มีชนิดชัดเจน ใช้ JSON เฉพาะ block props และ display options ที่ผ่าน schema ตามชนิด block

## 5. โครงสร้างข้อมูลที่เสนอ

| Entity | ข้อมูล/ความสัมพันธ์หลัก |
| --- | --- |
| AdminUser | id, email normalized unique, emailVerifiedAt, passwordHash nullable, status (invited/active/suspended), sessionVersion, authorizationVersion |
| AdminSession | id, userId, authMethod, providerId nullable, authenticatedAt, expiresAt, revokedAt สำหรับเพิกถอน session ได้ทันที |
| Role / Permission | role key/name, system/protected flag; permission keys เป็น catalog ในโค้ด |
| UserRole / RolePermission | many-to-many assignments พร้อม unique constraints; รวมสิทธิ์แบบ allow และ default deny |
| OAuthProvider | id, immutable key, type, label, enabled, order, activeConfigVersionId, draftConfigVersionId |
| OAuthProviderConfig | providerId, version, clientId, encryptedSecret, keyVersion, validated config, testedAt, testedBy; เก็บ version ที่ active/draft แยกกัน |
| OAuthIdentity | userId, providerId, issuer, subject, displayEmail; unique(providerId, issuer, subject) เป็นตัวระบุบัญชีจริง |
| OAuthAttempt | stateHash, nonce/PKCE data ตาม protocol, intent (login/link/test/reauth), provider/configVersion, initiatingUser/session, expiresAt, consumedAt; อายุสั้นและใช้ครั้งเดียว |
| UserInvitation | normalizedEmail, intendedRoles, tokenHash, expiresAt, acceptedAt, invitedBy; roles ตรวจสิทธิ์ซ้ำเมื่อรับคำเชิญ |
| SiteSettings | singleton: branding, SEO, defaultTabId, footer, display options |
| NavigationGroup | id, label, sortOrder, visibility |
| PortfolioTab | id, groupId, slug unique, icon, template, sortOrder, publication state |
| TabSlugAlias | oldSlug unique → tabId |
| PageBlock | tabId, type, sortOrder, validated props, entity references |
| Profile | singleton: name, alias, role, bio, location, portraitMediaId, resumeMediaId |
| Education / SocialLink | ข้อมูลการศึกษาและช่องทางติดต่อที่เรียงลำดับได้ |
| Project | slug, title, category, period, summary, highlights, links, coverMediaId, illustration, featured |
| Experience | company, role, dates/display period, description, details, sortOrder |
| SkillGroup / Technology | กลุ่มทักษะและรายการเทคโนโลยี เชื่อม project/experience ผ่าน join tables |
| MediaAsset | provider, storageKey, originalName, mimeType, size, dimensions, alt, visibility, status |
| ContentRevision | entityType/id, version, validated draft snapshot, author, createdAt |
| AuditLog | ผู้ทำ รายการที่แก้ action เวลา และ record id โดยไม่บันทึก password/token |
| LoginAttempt | เวลาลอง login และ key แบบ hash สำหรับ rate limit ที่ใช้ร่วมกันหลาย instance |

ทุก entity ที่แก้ไขได้มี createdAt, updatedAt และ version สำหรับตรวจการแก้ทับกัน ใช้ UUID เป็น id และ FK ตามความสัมพันธ์จริง พร้อม indexes ที่ slug, group/order, publication state และ join keys

### Draft / publish

- การ Save เก็บ revision ฉบับร่าง ส่วน public API อ่านเฉพาะ published records
- Publish ตรวจ schema และ references แล้วนำ snapshot ไปปรับ published records ใน transaction เดียว พร้อมเพิ่ม version และ audit log
- การแก้ group/tab/block ที่เกี่ยวกัน publish เป็นชุดเดียว เพื่อไม่ให้หน้าเว็บเห็นโครงสร้างครึ่งเก่าครึ่งใหม่
- มี authenticated preview อ่าน revision ฝั่ง admin; ห้าม draft รั่วผ่าน public endpoint, public media route หรือ cache
- แก้ไขชน version ให้ตอบ 409 และให้โหลดข้อมูลล่าสุดก่อนบันทึกใหม่
- Undo/restore ใช้ revision เดิมสร้างเป็น draft ใหม่แล้ว publish ไม่ย้อน migration ฐานข้อมูล

## 6. API contract

ใช้ response envelope เหมือนกันสำหรับ application API ที่เราสร้าง ส่วน auth module endpoints คง contract ของ module และไฟล์ตอบเป็น binary stream ตามประเภทไฟล์

### ข้อมูลชิ้นเดียว

```json
{
  "data": {
    "id": "tab-id",
    "slug": "me",
    "template": "introduction",
    "content": { "name": "Phuttinan Phaksaweng", "alias": "Got" }
  }
}
```

### รายการที่แบ่งหน้า

ให้ `data` เป็น object เสมอตามที่ขอ รายการอยู่ใน `data.items` ส่วน pagination อยู่ใน `meta` ไม่เพิ่ม pagination ให้ทุก nested array

```json
{
  "data": {
    "slug": "projects",
    "template": "project-list",
    "items": [{ "id": "project-id", "slug": "pretest", "name": "Pre-test registration" }]
  },
  "meta": {
    "pagination": { "page": 1, "perPage": 12, "total": 25, "totalPages": 3, "hasNextPage": true, "hasPreviousPage": false }
  }
}
```

`?page=1&perPage=12` ใช้ page เริ่ม 1, default 12, max 50; invalid query ตอบ 400 รายการเรียงด้วย sortOrder แล้ว id เพื่อให้ลำดับแน่นอน filter/search ทำที่ server ก่อน count และ paginate; หน้าเกินช่วงคืน items ว่างพร้อมจำนวนจริง กรณี total=0 ให้ totalPages=0

### Error

```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please check the submitted fields.",
    "fields": { "slug": ["This slug is already used."] }
  },
  "meta": { "requestId": "request-id" }
}
```

ใช้ HTTP status จริง: 400 validation, 401 ไม่ได้ login, 403 ไม่มีสิทธิ์, 404 ไม่พบ/ไม่เผยแพร่, 409 version conflict, 413 ไฟล์ใหญ่, 415 ชนิดไฟล์ไม่รองรับ, 429 rate limit และ 500 server error โดยไม่คืน stack trace หรือ credentials

### Routes หลัก

| Method / route | หน้าที่ |
| --- | --- |
| GET `/api/site` | branding, profile summary, published groups/tabs และ default tab |
| GET `/api/portfolio/:slug` | เนื้อหาแท็บที่ publish แล้ว พร้อม pagination ตาม template |
| GET `/api/projects/:slug` | รายละเอียดโปรเจกต์ใน modal/deep link |
| GET `/api/media/:id` | stream เฉพาะไฟล์ที่อนุญาตเผยแพร่ |
| POST `/api/auth/login` | ตรวจบัญชีและสร้าง session |
| POST `/api/auth/logout` | revoke session และล้าง cookie |
| GET `/api/admin/session` | ข้อมูลผู้ใช้ที่จำเป็นต่อ admin |
| GET/POST/PATCH/DELETE `/api/admin/{resource}` | CRUD ตาม resource; detail mutations ใช้ `/:id` |
| PATCH `/api/admin/navigation/order` | จัดลำดับ/ย้ายกลุ่มใน transaction |
| POST `/api/admin/publish` | publish revision ที่เลือกอย่างสอดคล้องกัน |
| GET `/api/admin/preview/:tabId` | preview draft แบบ authenticated และ no-store |
| POST `/api/admin/media/upload` | authorize/start upload ตาม storage provider |
| POST `/api/admin/media/complete` | ตรวจไฟล์สำเร็จก่อนสร้าง usable asset |
| GET `/api/admin/media/:id/content` | ดูไฟล์ draft/private เฉพาะ admin |
| GET `/api/health` | health/readiness แบบไม่เปิดเผยข้อมูลการเชื่อมต่อ |

วาง static routes แยกจาก dynamic routes ตรวจ reserved slugs และ route conflicts ย้ายหรือเลิกใช้ `/api/profile` เดิมหลัง refactor ทุก consumer เพื่อไม่เหลือแหล่งข้อมูลจากไฟล์

## 7. หน้าเว็บโหลด API อัตโนมัติ

1. SSR โหลด `/api/site` และ endpoint เริ่มต้นด้วย `useFetch` / `useAsyncData`; ใช้ Nuxt payload ต่อใน hydration เพื่อไม่ยิงซ้ำโดยไม่จำเป็น
2. เปลี่ยนแท็บ/filter/page แล้วโหลด endpoint ใหม่อัตโนมัติ พร้อม key ที่รวม slug และ query
3. ยกเลิก request เก่าและป้องกัน response ที่มาช้าทับแท็บล่าสุด
4. Preview รับ `response.data` และ JSON แสดง envelope ทั้งก้อนจาก response เดียวกัน ไม่มี fallback ไปข้อมูล mock/import เดิม
5. ปุ่ม Send เป็น refresh/retry เรียก URL ปัจจุบันอีกครั้งและอัปเดตทั้ง Preview/JSON
6. Headers/status/duration แสดงค่าที่วัดได้จริง; กรณี SSR ไม่มี browser timing ให้บอกว่าโหลดจาก server โดยไม่สร้างตัวเลขสมมติ
7. มี loading skeleton, error พร้อม Retry, empty state และ not-found สำหรับแท็บที่ซ่อน/ถูกลบ
8. เมนู mobile, search, tab bar, selected project, SEO และ request history ต้องใช้ dynamic ids และข้อมูล API ด้วย
9. ช่วงแรก public content API ใช้ no-store เพื่อลดปัญหาข้อมูลเก่าหลัง publish; หากเพิ่ม cache ภายหลังต้องใช้ content version และกำหนดระยะเวลาการอัปเดตชัดเจน ไม่พึ่ง in-memory invalidation บน serverless

## 8. Login, OAuth และระบบสิทธิ์

### 8.1 แนวทางและขอบเขต

ทำระบบหลายบัญชีและ RBAC ตั้งแต่รอบแรก Bootstrap เจ้าของเว็บเป็น Owner และเชิญผู้ร่วมจัดการภายหลังได้ การ login ยืนยันตัวตน ส่วน permission เป็นตัวตัดสินว่าใช้งานอะไรได้ จึงไม่ให้สิทธิ์ admin เพียงเพราะ login ผ่าน Google/Microsoft/GitHub สำเร็จ

เตรียม adapters ของ Google, Microsoft และ GitHub ไว้ตั้งแต่ implementation รอบแรก แต่ปิดไว้จนกว่าจะใส่ credentials และทดสอบสำเร็จ เพิ่ม configuration ของ provider ที่รองรับผ่านหน้า admin ได้โดยไม่ deploy ใหม่ ส่วน provider ชนิดใหม่ที่ยังไม่มี adapter ต้องเพิ่มโค้ด/ตรวจ protocol ก่อน ไม่รับ arbitrary authorization/token URLs จากฟอร์มทั่วไป

ใช้ OAuth helpers ของ [nuxt-auth-utils](https://nuxt.com/modules/auth-utils) เป็นพื้นฐาน และสร้าง server-side provider registry อ่าน config จาก DB ต่อ request ไม่เปลี่ยน global runtimeConfig ร่วมกันระหว่างผู้ใช้ ต้องทำ integration spike ยืนยัน per-request config, callback path และ state handling ของรุ่นที่เลือกก่อนเริ่ม UI หาก helper ไม่ครอบคลุมให้ทำ adapter เฉพาะ provider ด้วย library มาตรฐาน โดยยังใช้ nuxt-auth-utils ดูแล session

### 8.2 แบบหน้าจัดการ Login methods

```text
Security / Login methods                         [Add provider]

Password login       Enabled        [Settings]
Google / Personal    Disabled       Not tested   [Configure]
Microsoft / Work     Enabled        Tested       [Configure]
GitHub               Enabled        Tested       [Configure]

Provider form
  Type              Google / Microsoft / GitHub
  Internal key      github-main (เปลี่ยนไม่ได้หลังสร้าง)
  Display name      Continue with GitHub
  Client ID         ...
  Client secret     ••••••••  [Replace] (ไม่มีปุ่มอ่านค่าที่บันทึก)
  Callback URL      https://<site>/auth/github-main [Copy]
  Provider options  tenant/account policy ตามชนิด
  Login order       ...
  Status            Draft / Tested / Enabled / Disabled
                    [Save draft] [Test connection] [Enable]
```

- เพิ่ม provider ผ่าน wizard: เลือกชนิด → ลงทะเบียน app ที่ provider → copy callback → ใส่ client ID/secret → test → enable
- Test เป็น OAuth round-trip จริง ผูกกับ admin session และ intent=test; แสดงข้อมูลบัญชีทดสอบเท่าที่จำเป็น ไม่สร้างผู้ใช้ ไม่ link identity และไม่เปลี่ยน login session ของผู้ทดสอบ
- Enable ได้เมื่อ config version ล่าสุดทดสอบผ่านแล้ว การแก้ client/secret/tenant/callback ทำให้ผลทดสอบเก่าใช้ไม่ได้
- เปลี่ยน config ของ provider ที่เปิดใช้ให้เก็บ draft config แยก ทดสอบก่อนสลับ active config ใน transaction เพื่อไม่ทำให้ login ที่ใช้งานอยู่พังระหว่างกรอก
- หน้า `/admin/login` โหลดเฉพาะ public descriptor: key, label, type, icon และลำดับ ของ provider ที่ enabled ไม่ส่ง client secret/internal config ไป browser
- การสร้าง OAuth app และออก credentials ยังต้องทำที่ console ของผู้ให้บริการ หน้า admin ไม่สามารถออก credentials แทนได้
- การ disable provider ปิดทั้งการเริ่ม login และ callback ที่ยังค้าง พร้อม revoke sessions ที่ login ผ่าน provider นั้น และบันทึกผลกระทบก่อนยืนยัน

### 8.3 Provider-specific configuration

| Provider | ค่าตั้งต้นและข้อกำหนด |
| --- | --- |
| Google | OIDC scopes `openid email profile`; ใช้ issuer + subject เป็น identity, ตรวจ email_verified หากใช้ email รับคำเชิญ; ไม่ตัดสินสิทธิ์จาก domain hint |
| Microsoft | ระบุ tenant ID แบบ single-tenant เป็น default; เลือก organizational/personal account support ให้ตรง app registration; ตรวจ issuer/audience/tenant, ไม่ถือว่า preferred_username เป็น email ที่ verified |
| GitHub | OAuth scopes เท่าที่จำเป็นต่อ profile/email เช่น `read:user`, `user:email`; ใช้ immutable user id และตรวจ verified email ผ่าน email API เมื่อจำเป็น; ไม่ขอ repository access เพื่อ login |

แยก provider credentials และ callback origins ระหว่าง local, preview และ production; preview ใช้ URL คงที่ที่ลงทะเบียนไว้ ไม่ใช้ wildcard callback และไม่เชื่อ Host header ที่ผู้ใช้ส่งมาเป็น canonical origin

### 8.4 Login, invitation และ account linking

1. ผู้ใช้เลือก provider → server ตรวจ enabled/config → สร้าง OAuthAttempt อายุไม่เกิน 10 นาที ผูก browser flow และ redirect ไป provider
2. Callback ตรวจ state แบบใช้ครั้งเดียว, PKCE เมื่อ protocol รองรับ และ OIDC nonce/signature/issuer/audience/expiry สำหรับ OIDC; OAuth แบบ GitHub ตรวจ identity ผ่าน provider API ไม่สมมติว่ามี ID token
3. Consume attempt แบบ atomic ปฏิเสธ replay, intent mismatch, expired flow และ config version ที่เปลี่ยนระหว่างทาง
4. ถ้าพบ linked identity ให้ตรวจบัญชี active และ permissions จาก DB ก่อนออก session ใหม่
5. ถ้า identity ใหม่ ไม่มี open registration: ต้องรับคำเชิญที่ยังไม่หมดอายุและพิสูจน์ email ให้ตรงคำเชิญได้ หรือ link จากบัญชีที่ login อยู่แล้ว
6. หาก provider ไม่ยืนยัน email ให้ใช้วิธี login ที่มีอยู่เพื่อ link หรือผ่านขั้นตอนยืนยันเจ้าของบัญชีโดย operator ห้าม auto-create privileged account จาก email ที่ไม่ verified
7. ห้าม auto-link กับบัญชีเดิมจาก email ตรงกันอย่างเดียว แม้ provider ส่ง verified email; ให้ login บัญชีเดิมก่อนแล้วกด Connect provider
8. รับคำเชิญใน transaction เดียว: consume invitation, ตรวจ roles ยังอนุญาตให้ assign, สร้างบัญชี/identity แล้วจึงออก session
9. Link/unlink ทำจาก `/admin/account` ต้อง re-auth ภายใน 5 นาที ผูก intent กับ user/session ปัจจุบันและยืนยันบัญชีปลายทาง; identity ที่ผูกกับคนอื่นตอบ conflict
10. หลัง login ส่งไป path ภายในที่ allowlist เช่น `/admin` เท่านั้น ไม่รับ redirect URL ภายนอก

Invitation แสดง one-time link ให้ผู้มีสิทธิ์คัดลอกส่งเอง เก็บเฉพาะ token hash อายุเริ่มต้น 48 ชั่วโมง ไม่มีการส่ง email อัตโนมัติในรอบแรก การรับคำเชิญด้วย password ต้องมีขั้นตอนพิสูจน์เจ้าของ email หรือ operator bootstrap; token ที่ถูกส่งต่ออย่างเดียวไม่เพียงพอสำหรับผูก OAuth ให้บัญชีเดิม

ไม่เก็บ provider access/refresh tokens ระยะยาวเมื่อใช้แค่ login ใช้ tokens ใน callback เพื่ออ่าน identity แล้วทิ้ง; หากอนาคตจะเรียก GitHub/Google APIs ให้แยก integration consent และ encrypted token storage ออกจาก login

### 8.5 Roles และ permission matrix

ใช้หลาย roles ต่อผู้ใช้ได้ รวม allow permissions, ไม่กำหนด deny override ในรอบแรก Owner เป็น protected system role; custom roles สร้างได้จาก permission catalog เท่านั้น เพิ่ม permission key ใหม่ต้องมี server implementation

| Permission / หน้าที่ | Owner | Access Manager | Editor | Viewer |
| --- | --- | --- | --- | --- |
| `admin.access`, `content.read` | ✓ | ✓ | ✓ | ✓ |
| `content.write`, `navigation.write`, `media.write` | ✓ | — | ✓ | — |
| `content.publish` | ✓ | — | — | — |
| `settings.write` | ✓ | — | — | — |
| `users.read`, `users.invite`, `users.manage` | ✓ | ✓ จำกัดขอบเขต | — | — |
| `roles.read`, `roles.create`, `roles.update`, `roles.assign` | ✓ | ✓ จำกัดขอบเขต | — | — |
| `auth.providers.read`, `auth.providers.manage` | ✓ | ✓ | — | — |
| `auth.policy.manage` (password login/admission policy) | ✓ | — | — | — |
| `sessions.revoke` (ของคนอื่น), `audit.read` | ✓ | ✓ จำกัดขอบเขต | — | — |
| `ownership.manage` (เพิ่ม/ลด/โอน Owner) | ✓ | — | — | — |

Editor บันทึก draft ได้ แต่ publish ไม่ได้; หากต้องการให้เผยแพร่ให้ Owner สร้าง Publisher role เพิ่ม `content.publish` แล้ว assign คู่กับ Editor ส่วนทุกบัญชีจัดการ password, identities และ sessions ของตัวเองได้ตาม self-service policy โดยไม่ต้องมีสิทธิ์จัดการคนอื่น

Access Manager มีหน้าที่จัดการ login โดยเฉพาะ จึงถือเป็นผู้มีสิทธิ์สูงที่เข้าถึง provider configuration ได้ แต่ไม่มีสิทธิ์เนื้อหาโดยอัตโนมัติ

### 8.6 ป้องกันยกระดับสิทธิ์และล็อกตัวเองออก

- ตรวจ permission ในทุก API ด้วย `requirePermission(event, key)` และตรวจ target user/role อีกชั้น การซ่อนเมนูอย่างเดียวไม่ใช่การป้องกัน
- ผู้ที่ไม่ใช่ Owner จัดการได้เฉพาะผู้ใช้/roles ที่มี permissions เป็น strict subset ของตน ห้ามแก้ role ของตัวเองหรือ role ที่ตนถืออยู่ ห้าม assign/สร้าง role ที่เพิ่มสิทธิ์เกินขอบเขตตน และห้ามจัดการ Owner/ผู้มีสิทธิ์เท่ากันหรือสูงกว่า
- จำกัดการแก้ RolePermission ด้วย checks เดียวกันเพื่อปิดช่องเพิ่มสิทธิ์ผ่าน role ที่ assign ให้ผู้ใช้อื่นอยู่แล้ว; ตรวจ effective permissions ของผู้ได้รับผลทุกคนก่อนบันทึก
- Protected roles เป็น immutable templates ใน UI; custom role copy แล้วแก้ได้ตามเพดานสิทธิ์; Owner role assign ได้เฉพาะ flow ownership พร้อม re-auth
- ต้องเหลือ active Owner อย่างน้อยหนึ่งคนที่มี login method ใช้งานได้ ห้ามลบ/ระงับ/ลด role คนสุดท้าย ถอด identity สุดท้าย หรือปิดทุก login method ที่ Owner เข้าถึงได้
- การปิด password login ทำได้หลัง Owner เชื่อม OAuth ที่ทดสอบสำเร็จและมี recovery path แล้ว แสดง affected accounts และวิธีเข้าระบบที่เหลือก่อน apply
- การแก้ security-sensitive settings, role assignments, provider secrets และ ownership ต้อง re-auth ภายใน 5 นาที; OAuth re-auth ต้องได้หลักฐานใหม่จาก provider ตามความสามารถของ adapter ไม่ถือว่า cookie เดิมพอ
- เปลี่ยน roles/suspend account/revoke login methods ให้มีผล request ถัดไป ผ่าน authorizationVersion/sessionVersion และ DB checks ไม่เชื่อ role snapshot ใน cookie
- ตรวจ last-owner และ concurrent role changes ภายใน transaction พร้อม lock/serialization และ retry เพื่อไม่ให้สอง request ลบสิทธิ์ Owner พร้อมกัน
- เตรียม operator recovery command ผ่านเครื่องที่ถือ server credentials สำหรับ reset password/restore owner access พร้อม audit; ไม่มี recovery endpoint สาธารณะ

### 8.7 Secret storage และ session controls

- OAuth client secrets ที่กรอกจาก admin เข้ารหัสแบบ authenticated encryption (เช่น AES-256-GCM) เก็บ ciphertext, nonce และ keyVersion ใน DB; master key อยู่ใน environment/secret manager แยกจาก DB และ `NUXT_SESSION_PASSWORD`
- Read API คืนแค่ `secretConfigured` และข้อมูล masked ไม่คืน plaintext แม้เป็น Owner; update secret เป็น write-only ไม่ log request body
- รองรับ key rotation แบบอ่าน key รุ่นเดิม/เขียนรุ่นใหม่ พร้อม re-encryption job และคู่มือ backup encryption keys แยกจาก DB เพื่อกู้คืนได้
- ไม่รับ arbitrary provider URLs ลด SSRF; หากเพิ่ม generic OIDC ภายหลังต้องออกแบบ issuer allowlist/discovery validation แยกก่อนเปิด

- ใช้ `nuxt-auth-utils` สำหรับ sealed-cookie session และ utilities hash/verify password ตาม [เอกสาร module](https://nuxt.com/modules/auth-utils)
- สร้างเจ้าของเว็บด้วยคำสั่ง bootstrap ที่รับค่าอย่างปลอดภัย ไม่มี public registration และไม่มี password เริ่มต้นใน repository
- เก็บ session cookie เฉพาะ userId/sessionId และค่าจำเป็น; ตรวจ AdminSession, expiry, user status, sessionVersion และ effective permissions ในทุก admin API
- Session หมดอายุ 8 ชั่วโมงเป็นค่าเริ่มต้น Logout revoke session; เปลี่ยน password หรือปิดบัญชี revoke ทุก session
- ตั้ง `NUXT_SESSION_PASSWORD` ความยาวอย่างน้อย 32 ตัวอักษร สุ่มจริง เก็บฝั่ง server; production cookie ใช้ HttpOnly, Secure และ SameSite
- Route middleware ช่วยเปลี่ยนหน้าไป login แต่ server ต้องตรวจสิทธิ์เองทุก request รวม upload/publish/preview
- ป้องกัน CSRF สำหรับ mutation ด้วยตรวจ Origin และ token ตาม flow ที่เลือก ไม่พึ่ง SameSite อย่างเดียว
- Login rate limit ใช้ DB-backed atomic counters/attempts และ backoff เพื่อทำงานได้บนหลาย Vercel instances; cleanup ข้อมูลเก่าด้วยงานตามเวลา ไม่ใช้ memory map เป็นแหล่งหลัก
- ไม่เปิด account recovery email ในรอบแรก ใช้คำสั่ง reset password ฝั่ง operator พร้อม revoke session

Audit events ครอบคลุม login success/failure, invitation, link/unlink, session revoke, role/permission change, ownership และ provider/config change เก็บ actor/target/requestId/time และ diff ที่ตัด secrets ออก; กำหนด retention สำหรับ IP/login attempts โดยไม่เก็บ token/password/OAuth authorization code

### 8.8 Routes เพิ่มเติม

| Route | สิทธิ์/ข้อกำหนด |
| --- | --- |
| GET `/api/auth/providers` | public descriptors เฉพาะ enabled providers |
| GET `/auth/:providerKey` | start/callback ของ provider ที่ allowlist; callback ตรวจ OAuthAttempt |
| POST `/api/admin/account/oauth/:providerKey/link` | self + fresh re-auth; สร้าง link attempt |
| POST `/api/admin/account/reauth` | ยืนยัน password หรือเริ่ม OAuth intent=reauth ของ identity เดิม แล้วบันทึก authenticatedAt ฝั่ง server |
| DELETE `/api/admin/account/identities/:id` | self + fresh re-auth + last-login-method guard |
| GET/DELETE `/api/admin/account/sessions/:id` | sessions ของตนเท่านั้น; list ใช้ `/sessions` |
| CRUD `/api/admin/security/providers` | `auth.providers.read/manage`, write ต้อง re-auth; detail `/:id` |
| POST `/api/admin/security/providers/:id/test` | provider manager + re-auth; ทดสอบ draft config โดยยังไม่เปิด public |
| POST `/api/admin/security/providers/:id/activate` | provider manager + tested current version + lockout checks |
| PATCH `/api/admin/security/login-policy` | `auth.policy.manage` + re-auth |
| CRUD `/api/admin/security/users` | แยก read/invite/manage และ target restrictions; detail `/:id` |
| CRUD `/api/admin/security/roles` | แยก read/create/update; protected-role และ delegation checks |
| PUT `/api/admin/security/users/:id/roles` | `roles.assign` + re-auth + effective-permission checks |
| POST `/api/admin/security/users/:id/revoke-sessions` | `sessions.revoke` + target restrictions |
| POST `/api/admin/security/ownership` | `ownership.manage` + re-auth + last-owner protection |
| POST `/api/auth/invitations/accept` | single-use invitation + identity proof, ไม่ใช่ open signup |
| GET `/api/admin/security/audit` | `audit.read` + paginated result |

OAuth redirects/callbacks ใช้ HTTP redirect ตาม protocol ไม่ห่อเป็น JSON; CRUD API ใหม่ใช้ `data`/pagination/error envelope ตามข้อ 6 เช่นเดิม

## 9. ไฟล์และ Vercel Blob

Private Blob URL ไม่ใช่ public image URL จึงให้ Nuxt ตรวจสิทธิ์/สถานะเผยแพร่ แล้ว stream ด้วย SDK ตาม [Vercel Private Storage](https://vercel.com/docs/vercel-blob/private-storage)

- Public page อ้าง `/api/media/:id` แทน pathname หรือ credential ของ Blob
- Public route อ่านได้เฉพาะ asset ที่ marked published และมี reference จาก published content; draft ต้อง login ผ่าน admin route
- รูปโปรไฟล์, project screenshots, โลโก้ และ resume เก็บ binary ใน storage; DB เก็บ metadata/references
- เริ่มรองรับ JPEG/PNG/WebP ไม่เกิน 5 MB และ PDF ไม่เกิน 10 MB; ตรวจ signature/MIME, ขนาด และชื่อไฟล์ฝั่ง server ไม่อนุญาต HTML/SVG upload ในรอบแรก
- Vercel ใช้ direct client upload ที่ได้รับ token จำกัดสิทธิ์จาก server เพื่อไม่ส่งไฟล์ใหญ่ผ่าน function body; completion ต้อง verify object จริงกับ provider ก่อนบันทึกสถานะ ready และรองรับ callback ซ้ำอย่าง idempotent
- Draft preview cache เป็น private/no-store; public media เริ่ม no-store เพื่อให้การถอนเผยแพร่มีผลทันที อาจปรับ cache ภายหลังเมื่อกำหนด revocation policy แล้ว
- เปลี่ยนรูปให้อัปโหลด object ใหม่แล้วสลับ reference; ห้ามลบไฟล์ที่ยังถูกใช้โดย published content หรือ draft ที่เก็บไว้
- DB กับ storage ไม่ใช่ transaction เดียวกัน: ใช้ pending/ready/deleting states, retry และ cleanup orphan files หลัง grace period
- Token อยู่ใน server environment เท่านั้น ห้ามใส่ runtimeConfig.public หรือ client bundle
- ทำ storage interface `upload/read/delete/stat` รองรับ `vercel-blob` และ `local`; local ใช้ UUID storage key และ path containment ตรวจไม่ให้ traversal ออกจาก data directory
- Local files อยู่นอก public directory และอ่านผ่าน permission route เดียวกัน เพื่อให้ dev มีพฤติกรรมสิทธิ์เหมือน production
- Ubuntu เลือกใช้ Vercel Blob ต่อด้วย server credential หรือ local storage บน persistent volume ได้ ไม่จำเป็นต้องมี Vercel account สำหรับ dev แบบ local

## 10. โครงสร้างไฟล์ตาม Nuxt

```text
app/
  pages/index.vue
  pages/admin/...
  layouts/admin.vue
  middleware/admin.ts
  composables/usePortfolio.ts
  components/workspace/...
  components/portfolio/blocks/...
  components/admin/...
server/
  api/site.get.ts
  api/portfolio/[slug].get.ts
  api/projects/[slug].get.ts
  api/media/[id].get.ts
  api/auth/...
  api/admin/...
  routes/auth/[providerKey].get.ts
  auth/providers/          # Google / Microsoft / GitHub adapters + registry
  auth/permissions.ts      # permission catalog และ delegation rules
  auth/oauth-attempts.ts   # state, intent, nonce/PKCE และ replay protection
  services/                 # publication, content queries, navigation, media
  utils/db.ts
  utils/require-admin.ts
  utils/require-permission.ts
  utils/secret-encryption.ts
  utils/api-response.ts
  storage/                 # interface + local / Vercel adapters
shared/
  types/
  schemas/                 # API/input/block contracts; ไม่มี DB credentials
prisma/
  schema.prisma
  migrations/
  seed.ts
prisma.config.ts
scripts/                   # bootstrap admin, import media, reset password
tests/                     # API/auth/publication/integration/e2e
Dockerfile
compose.dev.yml
compose.prod.yml
.dockerignore
.env.example
docs/backend-admin-plan.md
docs/deployment.md
```

Prisma client/schema implementation อยู่ฝั่ง server; ย้ายข้อมูลเดิมไปเป็น seed source และเลิก import ข้อมูลตัวอย่างใน runtime ทั้ง client/server เมื่อย้ายเสร็จ

## 11. Docker และ deployment

### Development

- Dockerfile มี dev target ใช้ lockfile ติดตั้ง dependencies; Compose เปิด Nuxt บน 3000 และ PostgreSQL พร้อม healthcheck
- Bind mount source เพื่อ hot reload แยก node_modules volume ป้องกัน dependency Windows/Linux ปะปน
- ตั้ง HMR polling เป็นตัวเลือกสำหรับ Docker Desktop บน Windows
- PostgreSQL และ local media ใช้ named volumes; ค่า dev แยกจาก production ทั้ง DB และ storage
- รัน migrate/seed เป็นคำสั่งชัดเจนหลัง DB ready; seed ทำซ้ำได้โดยไม่เขียนทับเนื้อหาที่ผู้ใช้แก้แล้ว
- จัดคู่มือเริ่ม dev ตั้งแต่เครื่องใหม่ รวม reset dev ที่ระบุชัดว่าเป็นการลบข้อมูล local

### Vercel

- Connect Prisma Postgres และ Blob store เข้ากับ project แยก Development/Preview/Production
- ตรวจ build preset ของ Nuxt/Nitro สำหรับ Vercel และใช้ Node runtime ที่ driver/SDK รองรับ
- Generate Prisma client ตอน build; production migration เป็น release step ที่ควบคุมให้รันหนึ่งชุดต่อ release ไม่รันทุก request
- Preview deploy ต้องใช้ DB/storage แยกและไม่รัน migration/seed ใส่ production
- Migration ใช้แนวทางเพิ่มก่อนลบเพื่อให้แอปรุ่นเก่า/ใหม่ทำงานร่วมระหว่าง rollout ได้
- Production ใช้ `migrate deploy`; seed/import ทำแบบ explicit ครั้งแรก ไม่ผูกให้เขียนทับข้อมูลทุก deploy
- ตรวจ database region เทียบ function region และขีดจำกัด pool/plan จริงก่อน deploy

### Ubuntu production

- Dockerfile multi-stage build ด้วย Nitro `node-server` แล้วรัน `.output/server/index.mjs` ด้วย non-root user
- Compose production มี app, PostgreSQL แบบเลือกเปิดได้ และ Caddy/reverse proxy สำหรับ HTTPS; DB ไม่ expose สู่ internet
- รองรับ remote Prisma Postgres/Vercel Blob หรือ local PostgreSQL/local media ผ่าน environment โดยไม่แก้ business logic
- local PostgreSQL และ media ต้องมี persistent volumes, backups และทดสอบ restore; ไม่เก็บ upload ใน container layer
- ทำ readiness, restart policy, graceful shutdown และ structured logs ที่ไม่แสดง secrets
- Migration เป็น one-off job ก่อน switch release; rollback app ใช้ image ก่อนหน้า ส่วนข้อมูลกู้คืนด้วยแผน forward-fix/backup ไม่สมมติว่า migration ย้อนกลับได้เสมอ
- ไม่มี background timer ใน Nuxt เพื่อทำ cleanup บน Vercel: ใช้ protected scheduled job ส่วน Ubuntu เรียก job เดียวกันผ่าน scheduler

### Environment ที่จะจัดทำตัวอย่าง

`DATABASE_URL` (runtime pooled), `DIRECT_URL` (migration), `NUXT_SESSION_PASSWORD`, canonical site origin, OAuth secret encryption keyring + active key version, storage provider, `BLOB_READ_WRITE_TOKEN` หรือ OIDC/store configuration ตาม SDK/hosting ที่ใช้, local storage directory และ scheduled-job secret

OAuth client credentials จัดการผ่าน admin และเก็บแบบเข้ารหัสใน DB ของแต่ละ environment; encryption master keys อยู่ฝั่ง server เท่านั้น แยก local/preview/production ไม่ copy production credentials ไป preview และไม่ส่ง keyring ไป client สำหรับ provider ที่ต้องใช้ environment configuration ระหว่าง integration spike ให้ใช้ server-only placeholders ก่อนย้ายเข้าสู่ DB adapter

Deploy checklist เพิ่มการลงทะเบียน callback ของแต่ละ provider ให้ตรง canonical origin, ทดสอบ login/link/logout ผ่าน HTTPS จริง, ตรวจ reverse proxy headers และสำรอง encryption keys แยกจาก DB ก่อนเปิดใช้งาน OAuth

ชื่อ config จริงต้อง map กับ Prisma/Nuxt รุ่นที่ติดตั้ง; `.env.example` มีเฉพาะ placeholder ไม่มี secret โดย Vercel ใช้ environment settings และ Docker inject ตอน runtime ไม่ bake ลง image

## 12. ลำดับการทำงานและเกณฑ์ผ่าน

### Phase 1 — Foundation และ data migration

- [x] ตรึง dependency versions ที่เข้ากันได้ ตั้ง DB client, schemas, response helpers และ env validation
- [x] สร้าง migration, dev Compose และ seed จาก portfolio/workspace เดิม รวมข้อความที่ฝังอยู่ในหน้าเว็บ
- [x] ออกแบบ import รูป/เรซูเม่เข้า storage และ map media ids; dry-run ก่อนเขียนข้อมูลจริง
- [x] ผ่านเมื่อ DB ใหม่แสดงข้อมูลเดิมครบ และ seed ซ้ำไม่ทำลายข้อมูลที่แก้แล้ว (ตรวจด้วย PostgreSQL 17 local และ Prisma Postgres Preview)

### Phase 2 — Public API และ dynamic frontend

- [x] สร้าง site/tab/project/media APIs พร้อม envelope, filters, pagination และ published-only policy
- [x] เปลี่ยนหน้าเว็บทั้งหมดให้อ่าน API อัตโนมัติ ไม่มี static fallback
- [x] แยก renderer ตาม template/block และแก้ sidebar/search/mobile/tab state ให้เป็น dynamic
- [x] ผ่านเมื่อเปิดหน้าโดยไม่กด Send ก็เห็นข้อมูลจาก DB, เปลี่ยนแท็บโหลดจริง และ JSON ตรงกับ Preview (ตรวจด้วย local, Docker cloud-backed และ Vercel Preview)

### Phase 3 — Authentication และ Admin

- [x] Bootstrap owner, login/logout, server authorization, CSRF, distributed rate limit และ session revocation
- [x] ทำ Role/Permission/UserRole, protected Owner, custom roles และ `requirePermission` พร้อม delegation/last-owner guards
- [x] ทำหน้าจัดการ users, invitations, roles, login methods, account identities/sessions และ security audit
- [x] ทำ provider registry และ adapters Google/Microsoft/GitHub อ่าน config ต่อ request; เริ่มด้วย integration spike ก่อนทำฟอร์มจริง
- [x] ทำ encrypted secret storage, config drafts/test/activate, OAuth attempts และ callback validation ตาม protocol
- [x] ทำ invite-only onboarding, explicit link/unlink, re-auth และ operator recovery; ไม่ auto-link จาก email
- [x] สร้างหน้าจัดการ content/groups/tabs/blocks/settings พร้อม validation และ version conflict
- [x] ทำ draft preview, transactional publish และ audit trail
- [x] ผ่านเมื่อเพิ่มกลุ่ม/แท็บ custom จาก admin แล้ว publish ปรากฏหน้าเว็บโดยไม่ deploy ใหม่
- [x] ผ่านเมื่อ Owner มอบ Access Manager ให้จัดการ login ได้ แต่ Editor เข้า security APIs ไม่ได้ และ custom roles ไม่สามารถยกระดับสิทธิ์เกินผู้มอบ
- [x] ผ่านเมื่อเพิ่ม credentials ของ provider ที่รองรับจาก admin → test → activate → login บัญชีที่ได้รับอนุญาตได้ โดยไม่ deploy โค้ดใหม่ (Google และ GitHub ผ่าน; Microsoft ยังไม่มี credentials และถูกปิดตาม gate)

### Phase 4 — Media

- [x] ทำ Vercel/private และ local adapters พร้อม tokenized upload, validation และ completion verification
- [x] Media picker, alt text, replace, reference checks และ orphan cleanup
- [x] ผ่านเมื่อรูป/เรซูเม่จริงแสดงได้ ขณะ draft/private files เปิดผ่าน public route ไม่ได้

### Phase 5 — Deployment และส่งมอบ

- [ ] Docker production + Ubuntu HTTPS/backup/restore guide และ Vercel environment/release guide
- [ ] ทดสอบ migration/import กับฐานข้อมูลว่างก่อน production
- [ ] Typecheck/build และ integration tests กับ PostgreSQL จริง: pagination, visibility, publish atomicity, version conflict
- [ ] Auth tests: bypass frontend guard ไม่ได้, CSRF ถูกปฏิเสธ, logout/revocation มีผล, upload token ต้องมีสิทธิ์
- [ ] RBAC tests ครบ role × API รวม direct requests, การแก้ own role, assign permissions เกินตัวเอง, จัดการ Owner, role edits ที่กระทบผู้ใช้อื่น และ concurrent last-owner changes
- [ ] OAuth integration tests: success/cancel/denied consent, state replay/expiry, wrong intent, OIDC nonce/issuer/audience/tenant mismatch และ PKCE ตาม adapter
- [ ] Account tests: email ตรงกันไม่ auto-link, unverified/missing email ไม่ได้สิทธิ์, invitation หมดอายุ/ใช้ซ้ำ, identity ผูกคนอื่นแล้ว, unlink วิธีสุดท้าย และ suspended user
- [ ] Provider tests: test ไม่สร้าง session ใหม่, draft secret ไม่กระทบ active config, config เปลี่ยนต้อง retest, disable ปฏิเสธ callback ที่ค้าง และ sessions เดิมถูก revoke
- [ ] Secret tests: API/logs/client bundle ไม่มี plaintext secret, encryption key rotation อ่านข้อมูลเก่าได้ และ restore DB พร้อม keys แล้ว login ทำงาน
- [ ] ทดสอบ provider จริงทั้ง Google/Microsoft/GitHub เมื่อมี test credentials; mock tests อย่างเดียวไม่ถือว่าผ่าน live OAuth integration และต้องรายงานรายการที่ยังไม่ได้ทดสอบจริง
- [ ] Browser tests: auto-fetch, refresh, slow-response race, dynamic navigation, draft/publish และ desktop/mobile
- [ ] ตรวจ private media, rejected upload, DB outage, upload callback ซ้ำ และ storage failure ไม่ทำให้เกิด broken published reference
- [ ] Smoke test Vercel preview และ Docker production image; ลอง backup/restore DB+media ก่อนระบุว่าพร้อมใช้งาน

## 13. ขอบเขตและค่าที่ตั้งต้นไว้

- Bootstrap Owner หนึ่งคน แต่รองรับหลายบัญชี, roles, custom permissions และ invitation ตั้งแต่รอบแรก ไม่มีสมัครสมาชิกสาธารณะ
- เตรียม OAuth Google/Microsoft/GitHub พร้อมหน้าจัดการตั้งแต่รอบแรก เปิดใช้แต่ละเจ้าภายหลังเมื่อมี credentials; provider ชนิดอื่นเพิ่มผ่าน adapter ที่ตรวจสอบแล้ว
- OAuth ใช้สำหรับ login/link identity เท่านั้น ยังไม่ทำการอ่าน repo, Drive, mail หรือ calendar ของผู้ใช้
- Editor ปรับเนื้อหาและประกอบ blocks ที่เตรียมไว้ได้ ไม่ใช่เครื่องมือวาดหน้าแบบอิสระทุกพิกเซล
- ภาษา/เนื้อหาเว็บเดิมคงไว้ก่อน ป้ายใน admin ใช้ภาษาไทยได้; ยังไม่เพิ่มระบบหลายภาษา
- ยังไม่เพิ่ม analytics, comments, visitor accounts หรือ contact email delivery ในรอบนี้
- ขั้นเชื่อมบริการจริงต้องมี project/environment credentials แต่ไม่ต้องใช้ credentials เพื่อทำและตรวจแผนฉบับนี้
- แผนนี้ยังไม่เปลี่ยนข้อมูล cloud และยังไม่สร้างบริการที่มีค่าใช้จ่าย

## 14. เอกสารอ้างอิง

- [nuxt-auth-utils](https://nuxt.com/modules/auth-utils)
- [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)
- [Microsoft identity platform: OpenID Connect](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc)
- [GitHub: authorizing OAuth apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
- [GitHub REST API: email addresses](https://docs.github.com/en/rest/users/emails)
- [Prisma Postgres: connecting to your database](https://www.prisma.io/docs/postgres/database/connecting-to-your-database)
- [Vercel Blob: private storage](https://vercel.com/docs/vercel-blob/private-storage)
- [Vercel Blob SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk)

ตรวจเอกสารสำหรับประเด็น auth, DB connection และ Private Blob ณ วันที่จัดทำแผน ก่อนเริ่ม implementation จะตรวจ API ของ dependency versions ที่ติดตั้งอีกครั้ง
