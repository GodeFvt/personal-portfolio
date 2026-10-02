import assert from "node:assert/strict";
import test from "node:test";
import { ApiError, apiMessage, createApiClient } from "../app/lib/api/client";
import { createNitroAdapter } from "../app/lib/api/nitro-adapter";

test("SSR requests serialize JSON and query parameters and preserve response metadata", async () => {
  const client = createApiClient(
    createNitroAdapter(async (url, init) => {
      const parsed = new URL(url, "http://portfolio.local");
      assert.equal(parsed.searchParams.get("category"), "full stack");
      assert.equal(init?.method, "POST");
      assert.equal(
        new Headers(init?.headers).get("content-type"),
        "application/json",
      );
      assert.deepEqual(JSON.parse(String(init?.body)), { name: "Draft" });
      return Response.json(
        { data: { id: "record" } },
        { status: 201, headers: { "x-request-id": "request-1" } },
      );
    }),
  );
  const result = await client.raw<{ data: { id: string } }>(
    "/api/admin/content",
    {
      method: "POST",
      params: { category: "full stack" },
      data: { name: "Draft" },
    },
  );
  assert.equal(result.status, 201);
  assert.equal(result.headers["x-request-id"], "request-1");
  assert.equal(result.data.data.id, "record");
});

test("HTTP failures expose server error messages and status consistently", async () => {
  const client = createApiClient(
    createNitroAdapter(async () =>
      Response.json(
        {
          error: {
            code: "VERSION_CONFLICT",
            message: "This record has changed.",
          },
        },
        { status: 409 },
      ),
    ),
  );
  await assert.rejects(
    client.request("/api/admin/content"),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.statusCode, 409);
      assert.equal(apiMessage(error), "This record has changed.");
      return true;
    },
  );
});

test("CSRF tokens follow the current session and SSR clients stay isolated", async () => {
  let token = "first-session";
  const captured: Array<string | null> = [];
  const adapter = createNitroAdapter(async (_url, init) => {
    captured.push(new Headers(init?.headers).get("x-csrf-token"));
    return Response.json({ data: {} });
  });
  const first = createApiClient(adapter, () => token);
  const second = createApiClient(adapter, () => "other-session");
  await first.request("/api/admin/content", { method: "POST" });
  token = "rotated-session";
  await first.request("/api/admin/content", { method: "PATCH" });
  await second.request("/api/admin/content", { method: "DELETE" });
  await first.request("/api/site");
  assert.deepEqual(captured, [
    "first-session",
    "rotated-session",
    "other-session",
    null,
  ]);
});

test("credential-bearing API client rejects external and normalized non-API paths", async () => {
  let dispatched = false;
  const client = createApiClient(
    createNitroAdapter(async () => {
      dispatched = true;
      return Response.json({});
    }),
  );
  for (const path of [
    "https://example.com/api/site",
    "//example.com/api/site",
    "/api/../admin",
    "/api/../../outside",
  ]) {
    await assert.rejects(client.request(path), /local \/api\/ path/);
  }
  assert.equal(dispatched, false);
});

test("aborted requests never dispatch and in-flight requests receive their signal", async () => {
  const controller = new AbortController();
  let dispatched = false;
  const client = createApiClient(
    createNitroAdapter(async (_url, init) => {
      dispatched = true;
      assert.equal(init?.signal, controller.signal);
      return Response.json({ data: {} });
    }),
  );
  await client.request("/api/site", { signal: controller.signal });
  assert.equal(dispatched, true);
  dispatched = false;
  controller.abort();
  await assert.rejects(
    client.request("/api/site", { signal: controller.signal }),
  );
  assert.equal(dispatched, false);
});
