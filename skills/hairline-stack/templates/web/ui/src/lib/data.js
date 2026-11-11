// Fetching and caching. Pure enough for node --test: the fetcher and clock are injectable.

// GETs to the same path share one request. clear() aborts every read in flight, for
// when the whole view changes. A 401 sends the browser to sign in again.
export function createApi(fetcher = (...args) => fetch(...args), { signIn = "/signin?expired=1" } = {}) {
  const pending = new Map();
  function api(path, body, method) {
    const verb = method || (body ? "POST" : "GET");
    if (verb === "GET" && pending.has(path)) return pending.get(path).promise;
    const controller = new AbortController();
    const opts = { method: verb, credentials: "same-origin", headers: { Accept: "application/json" }, signal: controller.signal };
    if (body) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    const entry = { controller, promise: null };
    entry.promise = (async () => {
      try {
        const res = await Promise.resolve().then(() => fetcher(path, opts));
        const text = await res.text();
        if (controller.signal.aborted) throw new DOMException("Cancelled", "AbortError");
        let data;
        try { data = JSON.parse(text); } catch { data = {}; }
        if (!res.ok) {
          if (res.status === 401 && signIn && typeof window !== "undefined" && window.location) window.location.assign(signIn);
          const err = new Error(data?.error || "Request failed");
          err.status = res.status;
          throw err;
        }
        return data;
      } finally {
        // A cancelled read may settle after a new read of the same path starts.
        if (pending.get(path) === entry) pending.delete(path);
      }
    })();
    if (verb === "GET") pending.set(path, entry);
    return entry.promise;
  }
  api.clear = () => {
    pending.forEach(({ controller }) => controller.abort());
    pending.clear();
  };
  return api;
}

// A small LRU with a fresh interval and a maximum stale lifetime. A stale hit paints
// at once and refetches; reading promotes an entry but does not extend its deadlines.
export function createCache({ limit = 16, freshMs = 30000, keepMs = 300000, now = Date.now } = {}) {
  const entries = new Map();
  return {
    get(key) {
      const hit = entries.get(key);
      if (!hit) return null;
      const age = now() - hit.at;
      if (age > keepMs) { entries.delete(key); return null; }
      entries.delete(key);
      entries.set(key, hit);
      return { payload: hit.payload, fresh: age < freshMs };
    },
    set(key, payload) {
      entries.delete(key);
      entries.set(key, { payload, at: now() });
      while (entries.size > limit) entries.delete(entries.keys().next().value);
    },
    clear() { entries.clear(); },
  };
}

// Payloads are immutable between responses, so derived values can key on the payload
// object. Replacing the payload lets the whole cache be collected.
export function memoizeIdentity(compute) {
  const cache = new WeakMap();
  return function (source, ...args) {
    if (!source || typeof source !== "object") return compute(source, ...args);
    const variants = cache.get(source) || [];
    const hit = variants.find((entry) => entry.args.length === args.length && entry.args.every((arg, i) => arg === args[i]));
    if (hit) return hit.value;
    const value = compute(source, ...args);
    variants.push({ args, value });
    if (variants.length > 8) variants.shift();
    cache.set(source, variants);
    return value;
  };
}

// Filter by any word in name, email, or team, then sort. Ties keep a stable name order.
export const tableRows = memoizeIdentity((people, query, key, dir) => {
  const q = String(query || "").trim().toLowerCase();
  const rows = q ? people.filter((p) => (p.name + " " + p.email + " " + p.team).toLowerCase().includes(q)) : people.slice();
  const sign = dir === "ascending" ? 1 : -1;
  return rows.sort((a, b) => sign * ((a[key] || 0) - (b[key] || 0)) || a.name.localeCompare(b.name));
});
