// Small interface pieces: element and icon builders, per-browser preferences, the
// segmented control with its sliding thumb, deltas, and a focus trap.

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// 24px grid, 1.8 stroke, round caps. Add paths here instead of pulling an icon library.
const paths = {
  chevron: "m6 9 6 6 6-6",
  search: "m21 21-4.3-4.3M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z",
  sliders: "M4 7h10M18 7h2M4 17h2M10 17h10M16 4.5v5M8 14.5v5",
  download: "M12 4v11m0 0 4-4m-4 4-4-4M5 20h14",
  close: "M6 6l12 12M18 6 6 18",
  sun: "M12 3v2M12 19v2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M3 12h2M19 12h2M5.6 18.4 7 17M17 7l1.4-1.4M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  moon: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z",
  arrowUp: "M12 19V5m0 0-6 6m6-6 6 6",
  arrowDown: "M12 5v14m0 0 6-6m-6 6-6-6",
  back: "M19 12H5m0 0 6 6m-6-6 6-6",
  grip: "M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01",
};

export function icon(name, size = 16) {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  for (const [k, v] of Object.entries({ viewBox: "0 0 24 24", width: size, height: size, fill: "none", stroke: "currentColor", "stroke-width": name === "grip" ? 2.6 : 1.8, "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" })) svg.setAttribute(k, String(v));
  const path = document.createElementNS(NS, "path");
  path.setAttribute("d", paths[name] || "");
  svg.appendChild(path);
  return svg;
}

// Layout, theme, window, and chart options are preferences of this browser. They never
// go to the server.
export function readPref(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw == null ? fallback : JSON.parse(raw); } catch { return fallback; }
}
export function writePref(key, value) {
  try { if (value == null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
}

// Slides one 1px .hl-thumb under the chosen option. Works for .hl-seg and .hl-nav.
// The chosen element also carries aria-pressed / aria-current and full ink, so state
// never rests on the motion alone.
export function syncThumb(host, selector = '[aria-pressed="true"], [aria-current="page"]') {
  if (!host) return;
  let thumb = host.querySelector(":scope > .hl-thumb");
  if (!thumb) {
    thumb = el("span", "hl-thumb");
    thumb.setAttribute("aria-hidden", "true");
    host.prepend(thumb);
    if (typeof ResizeObserver !== "undefined") new ResizeObserver(() => syncThumb(host, selector)).observe(host);
  }
  const on = [...host.querySelectorAll(selector)].find((n) => !n.hidden);
  if (!on || !on.offsetWidth) { thumb.style.opacity = "0"; return; }
  thumb.style.opacity = "1";
  thumb.style.transform = `translateX(${on.offsetLeft}px) scaleX(${on.offsetWidth})`;
}

// options: [[key, label], ...]. Returns { host, set(key), value }.
export function createSeg(options, value, onChange, label) {
  const host = el("div", "hl-seg");
  host.setAttribute("role", "group");
  if (label) host.setAttribute("aria-label", label);
  let current = value;
  const buttons = options.map(([key, text]) => {
    const btn = el("button", "hl-seg-opt", text);
    btn.type = "button";
    btn.dataset.key = key;
    btn.setAttribute("aria-pressed", String(key === current));
    btn.addEventListener("click", () => { if (key !== current) { api.set(key); onChange(key); } });
    host.appendChild(btn);
    return btn;
  });
  const api = {
    host,
    set(key) { current = key; buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.key === key))); syncThumb(host); },
    get value() { return current; },
  };
  requestAnimationFrame(() => syncThumb(host));
  return api;
}

// change: { dir: "up" | "down" | "none", text: "+12%" }. Direction is carried by the arrow
// and the sign. Color only adds to them, and "up" is not automatically bad.
export function delta(change, empty = "") {
  const span = el("span", "hl-delta");
  if (!change || change.dir === "none") { span.textContent = empty; span.dataset.dir = "none"; return span; }
  span.dataset.dir = change.dir;
  span.textContent = change.text;
  span.prepend(icon(change.dir === "up" ? "arrowUp" : "arrowDown", 12));
  return span;
}

// Keeps Tab inside a dialog and hands focus back to whoever opened it.
export function trapFocus(dialog, opener) {
  dialog.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const items = [...dialog.querySelectorAll("button, a[href], input, select, textarea, summary, [tabindex]:not([tabindex='-1'])")].filter((n) => !n.disabled && n.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  dialog.addEventListener("close", () => { const back = opener(); if (back?.isConnected) back.focus({ preventScroll: true }); });
}

// The visible toast is aria-hidden. A separate, always-present live region carries the
// same words, because a region that is hidden or just inserted is not reliably announced.
export function createToast(root = document.body) {
  const box = el("div", "hl-toast");
  box.setAttribute("aria-hidden", "true");
  box.hidden = true;
  const live = el("div", "hl-sr");
  live.setAttribute("role", "status");
  live.setAttribute("aria-live", "polite");
  root.append(box, live);
  let t = 0, h = 0;
  return (text) => {
    clearTimeout(t); clearTimeout(h);
    live.textContent = "";
    requestAnimationFrame(() => { live.textContent = text; });
    box.textContent = text;
    if (box.hidden) { box.hidden = false; void box.offsetWidth; }
    box.classList.add("is-in");
    t = setTimeout(() => { box.classList.remove("is-in"); h = setTimeout(() => { box.hidden = true; }, 220); }, 3600);
  };
}

// Set .is-refreshing on `host` only when a refetch is slow, so fast ones never flicker.
export function slowFlag(host, promise, after = 450) {
  const timer = setTimeout(() => host.classList.add("is-refreshing"), after);
  return Promise.resolve(promise).finally(() => { clearTimeout(timer); host.classList.remove("is-refreshing"); });
}
