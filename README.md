# Phuttinan Workspace

A Nuxt 4 portfolio styled as an API workspace. Neutral black surfaces, restrained pink accents, and natural-color profile photos.

## Run

```sh
npm install
npm run dev
npm run typecheck
npm run build
```

Open http://localhost:3000. Node 22.12+ is required. Start production with `node .output/server/index.mjs` and set `PORT` if needed. Use a Node/Nitro-capable host for the API.

## Structure

- `app/pages/index.vue`: workspace views and interactions
- `app/assets/css/main.css`: shared base and project illustrations
- `app/assets/css/workspace.css`: neutral surfaces and workspace layout
- `app/components/workspace/`: portrait graph and project cards
- `shared/data/portfolio.ts`: public profile, work, experience, and image slots
- `shared/data/workspace.ts`: five endpoint definitions and payloads
- `server/api/portfolio/[endpoint].get.ts`: actual API requests
- `public/images/profile.jpg`: original full-color photo
- `public/resume/phuttinan-resume.pdf`: current downloadable resume

The previous classic route, its archive, and unused landing-page components have been removed.

## Interactions

Choose `/me`, `/projects`, `/experience`, `/stack`, or `/contact`. Preview displays visual content; JSON and Headers inspect portfolio data and actual server responses. Send makes a real request. Before a request, the interface explicitly shows a saved preview. Timing and history reflect real requests, and endpoint changes cancel pending requests.

Ctrl/Cmd+K searches, Ctrl/Cmd+Enter sends, arrow keys navigate response tabs, and Escape closes project details or mobile collections. Direct links such as `/?endpoint=projects` are supported. History is session-only, capped at 12 requests.

## เปลี่ยนข้อมูลและรูป

ข้อมูลหลักอยู่ใน `shared/data/portfolio.ts` ใช้เรซูเม่ล่าสุดเป็นหลักสำหรับชื่อภาษาอังกฤษ ช่วงเวลางาน Gridwhiz, freelance, senior project และ LinkedIn ข้อมูลโปรเจกต์เก่าและรูปโปรไฟล์มาจากพอร์ตเดิม

ปัจจุบันภาพโปรเจกต์เป็น **concept illustration** ไม่ใช่ screenshot ของระบบจริง โดยมีคำว่า CONCEPT กำกับไว้

1. แคปหน้าจอจริงที่ความกว้าง 1440px หรือ 1600px ใช้ข้อมูลตัวอย่างและซ่อนข้อมูลส่วนบุคคล เช่น ชื่อผู้สมัคร เบอร์โทร และผลสอบ
2. บันทึกเป็น WebP หรือ PNG แนะนำขนาด 1600 × 1000px (อัตราส่วน 8:5) ไม่เกินประมาณ 300KB
3. วางไฟล์ใน `public/images/projects/`
4. เปลี่ยน `image: null` ของโปรเจกต์นั้นในไฟล์ข้อมูลเป็น `image: '/images/projects/pretest.webp'` และแก้ `imageAlt` ให้ตรงกับภาพ
5. ถ้าไม่มีภาพหรือไฟล์โหลดไม่ได้ ระบบจะใช้ concept illustration อัตโนมัติ

| Project               | Suggested filename | ภาพที่แนะนำ                                                                |
| --------------------- | ------------------ | -------------------------------------------------------------------------- |
| Pre-test registration | `pretest.webp`     | หน้าสรุปการลงทะเบียนของ admin หรือหน้า flow สมัครสอบที่ใช้ข้อมูลตัวอย่าง   |
| School management     | `school.webp`      | ภาพรวมระบบ หรือ architecture diagram ที่ตรวจสอบกับ implementation จริงแล้ว |
| Kradan Kanban         | `kradan.webp`      | หน้าบอร์ดพร้อมคอลัมน์และงานตัวอย่าง                                        |

รูปโปรไฟล์อยู่ที่ `public/images/profile.jpg` เปลี่ยนได้โดยใช้ชื่อเดิม แนะนำภาพแนวตั้งที่มีพื้นที่รอบศีรษะ เรซูเม่ดาวน์โหลดอยู่ที่ `public/resume/phuttinan-resume.pdf`

## Design and validation

Nuxt UI, Tailwind CSS 4, Nuxt Icon, Geist, and Geist Mono. Dark surfaces use equal RGB channels to prevent a pink/purple cast. Pink is reserved for selected states, controls, headings, and project illustrations. Profile photos are displayed without grayscale or color blending.

The workspace has been checked across five endpoint views and four viewport widths, including requests, failure/retry, search, filters, clipboard actions, dialogs, keyboard navigation, request cancellation, and reduced motion. Run the build and type checks after edits.
