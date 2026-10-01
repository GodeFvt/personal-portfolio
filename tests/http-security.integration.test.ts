import assert from "node:assert/strict";
import test from "node:test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { hashAdminPassword } from "../server/utils/password";

const baseUrl = process.env.PHASE5_BASE_URL ?? "http://127.0.0.1:3217";
const email = process.env.ADMIN_BOOTSTRAP_EMAIL ?? "owner@phase5.test";
const password = process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "phase-five-owner-password";
let cookie = "";
let csrfToken = "";
const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL!;
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
const editorEmail = "editor@phase5.test";
const accessEmail = "access@phase5.test";
const secondaryPassword = "phase-five-secondary-password";

test.before(async () => {
  const [editorRole, accessRole] = await Promise.all([
    db.role.findUniqueOrThrow({ where: { key: "editor" } }),
    db.role.findUniqueOrThrow({ where: { key: "access-manager" } }),
  ]);
  const passwordHash = await hashAdminPassword(secondaryPassword);
  for (const [userEmail, roleId] of [[editorEmail, editorRole.id], [accessEmail, accessRole.id]] as const) {
    const user = await db.adminUser.create({ data: { email: userEmail, passwordHash, status: "ACTIVE", emailVerifiedAt: new Date() } });
    await db.userRole.create({ data: { userId: user.id, roleId, assignedBy: user.id } });
  }
});
test.after(async () => db.$disconnect());

function captureCookie(response: Response) {
  const values = response.headers.getSetCookie?.() ?? [];
  if (values.length) cookie = values.map((value) => value.split(";", 1)[0]).join("; ");
}

async function request(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (cookie) headers.set("cookie", cookie);
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers, redirect: "manual" });
  captureCookie(response);
  return response;
}

async function loginAs(userEmail: string, userPassword: string) {
  cookie = ""; csrfToken = "";
  const response = await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ email: userEmail, password: userPassword }),
  });
  assert.equal(response.status, 200);
  csrfToken = ((await response.json()) as { data: { csrfToken: string } }).data.csrfToken;
}

test("public API enforces visibility and pagination", async () => {
  const site = await request("/api/site");
  assert.equal(site.status, 200);
  const page = await request("/api/portfolio/projects?page=1&perPage=1");
  assert.equal(page.status, 200);
  const payload = await page.json() as { data: { items: unknown[] }; meta: { pagination: { page: number; perPage: number; total: number } } };
  assert.equal(payload.data.items.length, 1);
  assert.equal(payload.meta.pagination.page, 1);
  assert.equal(payload.meta.pagination.perPage, 1);
  assert.ok(payload.meta.pagination.total >= 1);
  assert.equal((await request("/api/portfolio/not-published")).status, 404);
});

test("frontend guards cannot replace server authorization and login requires same origin", async () => {
  assert.equal((await request("/api/admin/summary")).status, 401);
  const denied = await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(denied.status, 403);

  const login = await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(login.status, 200);
  const body = await login.json() as { data: { csrfToken: string } };
  csrfToken = body.data.csrfToken;
  assert.ok(cookie);
  assert.ok(csrfToken);
  assert.equal((await request("/api/admin/session")).status, 200);
});

test("CSRF and scoped upload grants are required for direct upload requests", async () => {
  const id = crypto.randomUUID();
  const reservationBody = { id, originalName: "phase5.png", mimeType: "image/png", size: 32, alt: "Phase 5 test" };
  const missingCsrf = await request("/api/admin/media/upload", {
    method: "POST", headers: { "content-type": "application/json", origin: baseUrl }, body: JSON.stringify(reservationBody),
  });
  assert.equal(missingCsrf.status, 403);

  const reservation = await request("/api/admin/media/upload", {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl, "x-csrf-token": csrfToken },
    body: JSON.stringify(reservationBody),
  });
  assert.equal(reservation.status, 200);
  const details = await reservation.json() as { data: { uploadUrl: string; uploadToken: string } };
  const invalidToken = await request(details.data.uploadUrl, {
    method: "POST",
    headers: { origin: baseUrl, "x-csrf-token": csrfToken, "x-media-upload-token": "invalid", "content-type": "image/png" },
    body: Buffer.alloc(32),
  });
  assert.equal(invalidToken.status, 403);

  const png = Buffer.alloc(32);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png);
  png.writeUInt32BE(1, 16); png.writeUInt32BE(1, 20);
  const upload = await request(details.data.uploadUrl, {
    method: "POST",
    headers: { origin: baseUrl, "x-csrf-token": csrfToken, "x-media-upload-token": details.data.uploadToken, "content-type": "image/png" },
    body: png,
  });
  assert.equal(upload.status, 200);
  const complete = await request("/api/admin/media/complete", {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl, "x-csrf-token": csrfToken },
    body: JSON.stringify({ id, uploadToken: details.data.uploadToken }),
  });
  assert.equal(complete.status, 200);
  assert.equal((await request(`/api/media/${id}`)).status, 404, "private media must not be public");
});

test("role-by-API enforcement blocks Editor and protects Owner changes", async () => {
  await loginAs(editorEmail, secondaryPassword);
  assert.equal((await request("/api/admin/content")).status, 200);
  assert.equal((await request("/api/admin/security/users")).status, 403);
  assert.equal((await request("/api/admin/media")).status, 200);

  await loginAs(accessEmail, secondaryPassword);
  const owner = await db.adminUser.findUniqueOrThrow({ where: { email } });
  const editor = await db.adminUser.findUniqueOrThrow({ where: { email: editorEmail } });
  const ownerRole = await db.role.findUniqueOrThrow({ where: { key: "owner" } });
  const forbiddenOwnerChange = await request(`/api/admin/security/users/${owner.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", origin: baseUrl, "x-csrf-token": csrfToken },
    body: JSON.stringify({ expectedVersion: owner.version, status: "ACTIVE", roleIds: [ownerRole.id] }),
  });
  assert.equal(forbiddenOwnerChange.status, 403);
  const forbiddenEscalation = await request(`/api/admin/security/users/${editor.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", origin: baseUrl, "x-csrf-token": csrfToken },
    body: JSON.stringify({ expectedVersion: editor.version, status: "ACTIVE", roleIds: [ownerRole.id] }),
  });
  assert.equal(forbiddenEscalation.status, 403);

  await loginAs(email, password);
  const freshOwner = await db.adminUser.findUniqueOrThrow({ where: { email } });
  const viewerRole = await db.role.findUniqueOrThrow({ where: { key: "viewer" } });
  const selfRemoval = await request(`/api/admin/security/users/${freshOwner.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", origin: baseUrl, "x-csrf-token": csrfToken },
    body: JSON.stringify({ expectedVersion: freshOwner.version, status: "ACTIVE", roleIds: [viewerRole.id] }),
  });
  assert.equal(selfRemoval.status, 409);
});

test("role edits invalidate affected authorization and provider changes require retest", async () => {
  await loginAs(email, password);
  const createdRole = await request("/api/admin/security/roles", {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl, "x-csrf-token": csrfToken },
    body: JSON.stringify({ key: "phase5-reviewer", name: "Phase 5 reviewer", description: null, permissionKeys: ["admin.access", "content.read"] }),
  });
  assert.equal(createdRole.status, 200);
  const role = ((await createdRole.json()) as { data: { role: { id: string; version: number } } }).data.role;
  const editor = await db.adminUser.findUniqueOrThrow({ where: { email: editorEmail } });
  await db.userRole.create({ data: { userId: editor.id, roleId: role.id, assignedBy: editor.id } });
  const before = (await db.adminUser.findUniqueOrThrow({ where: { id: editor.id } })).authorizationVersion;
  const changedRole = await request(`/api/admin/security/roles/${role.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", origin: baseUrl, "x-csrf-token": csrfToken },
    body: JSON.stringify({ expectedVersion: role.version, name: "Phase 5 reviewer", description: "Updated", permissionKeys: ["admin.access"] }),
  });
  assert.equal(changedRole.status, 200);
  assert.equal((await db.adminUser.findUniqueOrThrow({ where: { id: editor.id } })).authorizationVersion, before + 1);

  const provider = await db.oAuthProvider.findUniqueOrThrow({ where: { key: "google" } });
  const draft = await request(`/api/admin/security/providers/${provider.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", origin: baseUrl, "x-csrf-token": csrfToken },
    body: JSON.stringify({ expectedVersion: provider.version, label: provider.label, clientId: "phase5-client", clientSecret: "phase5-provider-secret", sortOrder: provider.sortOrder, options: { type: "google" } }),
  });
  assert.equal(draft.status, 200);
  const draftData = (await draft.json()) as { data: { provider: { version: number }; configVersion: number } };
  const storedConfig = await db.oAuthProviderConfig.findUniqueOrThrow({ where: { providerId_configVersion: { providerId: provider.id, configVersion: draftData.data.configVersion } } });
  assert.notEqual(storedConfig.encryptedSecret, "phase5-provider-secret");
  assert.equal(storedConfig.testedAt, null);
  const untested = await request(`/api/admin/security/providers/${provider.id}/activate`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl, "x-csrf-token": csrfToken },
    body: JSON.stringify({ expectedVersion: draftData.data.provider.version, configVersion: draftData.data.configVersion }),
  });
  assert.equal(untested.status, 409);
  await db.oAuthProviderConfig.update({ where: { id: storedConfig.id }, data: { testedAt: new Date() } });
  const activated = await request(`/api/admin/security/providers/${provider.id}/activate`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl, "x-csrf-token": csrfToken },
    body: JSON.stringify({ expectedVersion: draftData.data.provider.version, configVersion: draftData.data.configVersion }),
  });
  assert.equal(activated.status, 200);
  const activeProvider = await db.oAuthProvider.findUniqueOrThrow({ where: { id: provider.id } });
  const owner = await db.adminUser.findUniqueOrThrow({ where: { email } });
  const providerSession = await db.adminSession.create({ data: { userId: owner.id, providerId: provider.id, authMethod: "oauth", expiresAt: new Date(Date.now() + 60_000) } });
  const disabled = await request(`/api/admin/security/providers/${provider.id}/disable`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl, "x-csrf-token": csrfToken },
    body: JSON.stringify({ expectedVersion: activeProvider.version }),
  });
  assert.equal(disabled.status, 200);
  assert.ok((await db.adminSession.findUniqueOrThrow({ where: { id: providerSession.id } })).revokedAt);
});

test("logout revokes the server session and cannot be forged without CSRF", async () => {
  await loginAs(email, password);
  const forged = await request("/api/auth/logout", { method: "POST", headers: { origin: baseUrl, "x-csrf-token": "wrong" } });
  assert.equal(forged.status, 403);
  assert.equal((await request("/api/admin/session")).status, 200);

  const logout = await request("/api/auth/logout", { method: "POST", headers: { origin: baseUrl, "x-csrf-token": csrfToken } });
  assert.equal(logout.status, 200);
  assert.equal((await request("/api/admin/session")).status, 401);
});
