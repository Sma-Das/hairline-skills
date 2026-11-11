import test from "node:test";
import assert from "node:assert/strict";
import { createApi, createCache, memoizeIdentity, tableRows } from "../src/lib/data.js";
import { hashFor, parseHash } from "../src/lib/router.js";

const response = (status, body) => ({ ok: status < 400, status, text: async () => JSON.stringify(body) });

test("concurrent GETs to one path share a request", async () => {
  let calls = 0;
  const api = createApi(async () => { calls++; return response(200, { a: 1 }); });
  const [a, b] = await Promise.all([api("/v1/x"), api("/v1/x")]);
  assert.equal(calls, 1);
  assert.equal(a, b);
  await api("/v1/x");
  assert.equal(calls, 2);
});

test("an error carries the server's message and status", async () => {
  const api = createApi(async () => response(400, { error: "days must be 1 to 90" }), { signIn: "" });
  await assert.rejects(api("/v1/x"), (err) => err.status === 400 && err.message === "days must be 1 to 90");
});

test("cache entries go stale, then expire", () => {
  let now = 0;
  const cache = createCache({ freshMs: 10, keepMs: 100, now: () => now });
  cache.set("k", { v: 1 });
  assert.equal(cache.get("k").fresh, true);
  now = 50;
  assert.equal(cache.get("k").fresh, false);
  now = 101;
  assert.equal(cache.get("k"), null);
});

test("memoizeIdentity computes once per payload and arguments", () => {
  let runs = 0;
  const f = memoizeIdentity((src, n) => { runs++; return src.v * n; });
  const src = { v: 2 };
  assert.equal(f(src, 3), 6);
  assert.equal(f(src, 3), 6);
  assert.equal(runs, 1);
  f({ v: 2 }, 3);
  assert.equal(runs, 2);
});

test("tableRows filters on any field and sorts with a stable tie-break", () => {
  const people = [
    { name: "Bea", email: "bea@example.com", team: "Data", cents: 5, requests: 1 },
    { name: "Ann", email: "ann@example.com", team: "Design", cents: 5, requests: 3 },
    { name: "Cy", email: "cy@example.com", team: "Data", cents: 9, requests: 2 },
  ];
  assert.deepEqual(tableRows(people, "", "cents", "descending").map((p) => p.name), ["Cy", "Ann", "Bea"]);
  assert.deepEqual(tableRows(people, "data", "requests", "ascending").map((p) => p.name), ["Bea", "Cy"]);
});

test("hash routes fall back to the first page and decode ids", () => {
  assert.deepEqual(parseHash(""), { page: "overview", id: null });
  assert.deepEqual(parseHash("#nope/1"), { page: "overview", id: null });
  assert.deepEqual(parseHash(hashFor("people", "a/b c")), { page: "people", id: "a/b c" });
});
