// The imperative half of the page. Svelte components own the markup; this module finds
// their elements by id, loads data, and paints. One job per module: data.js fetches,
// format.js writes numbers, router.js reads the hash, hairline/js draws controls.
import { createApi, createCache, tableRows } from "./data.js";
import { change, count, day, dayRange, money, moneyShort } from "./format.js";
import { hashFor, pages, parseHash } from "./router.js";
import { createSeg, delta, el, icon, readPref, slowFlag, syncThumb, writePref } from "../hairline/js/ui.js";
import { countTo, setTheme } from "../hairline/js/motion.js";
import { enhanceSelect } from "../hairline/js/select.js";
import { hideTip, showTip, tipRow, tipTitle } from "../hairline/js/tooltip.js";
import { createPalette } from "../hairline/js/palette.js";
import { barChart, sparkline, watchWidth } from "../hairline/js/charts.js";

const $ = (id) => document.getElementById(id);
const WINDOWS = [[7, "7 days"], [30, "30 days"], [90, "90 days"]];

const api = createApi();
const cache = createCache();
const state = {
  days: WINDOWS.some(([d]) => d === readPref("app.days", 30)) ? readPref("app.days", 30) : 30,
  summary: null,
  sortKey: "cents",
  sortDir: "descending",
  query: "",
};
let chart = null;

export function start() {
  const root = document.body;

  // Theme and palette are this browser's preferences.
  const themeBtn = $("theme-toggle");
  const paintThemeBtn = () => { themeBtn.textContent = root.dataset.theme === "light" ? "Dark" : "Light"; };
  paintThemeBtn();
  themeBtn.addEventListener("click", () => { setTheme(root, root.dataset.theme === "light" ? "dark" : "light", "app.theme"); paintThemeBtn(); });
  const pick = $("palette-pick");
  pick.value = root.dataset.palette || "bronze";
  enhanceSelect(pick, { variant: "bar" });
  pick.addEventListener("change", () => {
    document.documentElement.classList.add("hl-no-transitions");
    if (pick.value === "bronze") delete root.dataset.palette; else root.dataset.palette = pick.value;
    writePref("app.palette", pick.value);
    requestAnimationFrame(() => document.documentElement.classList.remove("hl-no-transitions"));
  });

  const seg = createSeg(WINDOWS, state.days, (d) => { state.days = d; writePref("app.days", d); load(); }, "Window");
  $("window-host").appendChild(seg.host);

  document.querySelectorAll("th[data-sort] .hl-sort").forEach((btn) => btn.appendChild(icon("arrowDown", 12)));
  document.querySelectorAll("th[data-sort]").forEach((th) => th.querySelector("button").addEventListener("click", () => {
    const key = th.dataset.sort;
    state.sortDir = state.sortKey === key && state.sortDir === "descending" ? "ascending" : "descending";
    state.sortKey = key;
    document.querySelectorAll("th[data-sort]").forEach((other) => other.removeAttribute("aria-sort"));
    th.setAttribute("aria-sort", state.sortDir);
    paintPeople();
  }));
  $("people-filter").addEventListener("input", (e) => { state.query = e.target.value; paintPeople(); });

  createPalette({
    items: () => [
      ...pages.map((p) => ({ label: p[0].toUpperCase() + p.slice(1), group: "Pages", quick: true, hint: "Page", run: () => { location.hash = hashFor(p); } })),
      ...WINDOWS.map(([d, label]) => ({ label: "Show " + label, group: "Window", quick: true, run: () => { seg.set(d); state.days = d; writePref("app.days", d); load(); } })),
      ...(state.summary?.people || []).map((p) => ({ label: p.name, keywords: p.email + " " + p.team, group: "People", hint: p.team, run: () => { location.hash = hashFor("people"); $("people-filter").value = p.name; state.query = p.name; paintPeople(); } })),
    ],
  });
  $("palette-open").addEventListener("click", () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true })));

  chart = watchWidth($("chart"), paintChart);
  window.addEventListener("hashchange", route);
  route();
  load();
}

function route() {
  const { page } = parseHash(location.hash);
  document.querySelectorAll("main > [data-page]").forEach((node) => { node.hidden = node.dataset.page !== page; });
  document.querySelectorAll("#nav a").forEach((a) => { if (a.dataset.page === page) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  syncThumb($("nav"));
  $("view-live").textContent = page[0].toUpperCase() + page.slice(1);
}

// A fresh cache hit paints at once. A stale one paints, then refetches. A slow
// refetch dims the last figures instead of blanking them.
async function load() {
  const path = "/v1/summary?days=" + state.days;
  const hit = cache.get(path);
  if (hit) paint(hit.payload);
  if (hit?.fresh) return;
  try {
    const payload = await slowFlag($("main"), api(path));
    cache.set(path, payload);
    if (path === "/v1/summary?days=" + state.days) paint(payload);
  } catch (err) {
    if (err.name === "AbortError") return;
    showError(err);
  }
}

function showError(err) {
  const box = $("overview-error");
  box.hidden = false;
  box.replaceChildren(document.createTextNode("Could not load the summary. " + (err.message || "")));
  const retry = el("button", "hl-button", "Retry");
  retry.type = "button";
  retry.addEventListener("click", () => { box.hidden = true; load(); });
  box.appendChild(retry);
}

function paint(sum) {
  state.summary = sum;
  $("overview-error").hidden = true;
  $("scope").textContent = dayRange(sum.from, sum.to) + " · " + state.days + " days";
  countTo($("kpi-spend"), sum.total_cents, money);
  $("kpi-spend-note").replaceChildren(delta(change(sum.total_cents, sum.previous_cents), "No change"), document.createTextNode(sum.previous_cents ? " vs " + money(sum.previous_cents) : ""));
  $("kpi-spark").replaceChildren(sparkline(sum.days.map((d) => d.cents)));
  countTo($("kpi-requests"), sum.requests, count);
  $("kpi-requests-note").textContent = sum.days.length ? count(sum.requests / sum.days.length) + " a day" : "";
  countTo($("kpi-people"), sum.people.length, count);
  $("kpi-people-note").textContent = sum.people.length ? "with any spend" : "No one yet";
  paintChart(chart.width);
  paintPeople();
}

function paintChart(width) {
  const sum = state.summary;
  if (!sum || !width) return;
  const host = $("chart");
  host.classList.remove("hl-wait");
  host.replaceChildren(barChart(sum.days.map((d) => ({ label: day(d.day), value: d.cents })), width, {
    format: moneyShort,
    onHover: (row, e) => (row ? showTip([tipTitle(row.label), tipRow(money(row.value), "spend", "var(--hl-chart-bar)")], e.clientX, e.clientY) : hideTip()),
  }));
}

function paintPeople() {
  const people = state.summary?.people || [];
  const rows = tableRows(people, state.query, state.sortKey, state.sortDir);
  const max = Math.max(1, ...rows.map((p) => p.cents));
  $("people-rows").replaceChildren(...rows.map((p) => {
    const tr = el("tr");
    const who = el("td", "", p.name);
    who.appendChild(el("span", "hl-subtext", p.email));
    const team = el("td", "", p.team);
    team.dataset.prio = "low";
    const spend = el("td", "hl-numeric has-bar", money(p.cents));
    const bar = el("span", "hl-cell-bar");
    const fill = el("i");
    fill.style.setProperty("--value", String(p.cents / max));
    bar.appendChild(fill);
    spend.appendChild(bar);
    tr.append(who, team, spend, el("td", "hl-numeric", count(p.requests)));
    return tr;
  }));
  $("people-count").textContent = rows.length + " of " + people.length;
  const empty = $("people-empty");
  empty.hidden = rows.length > 0;
  empty.textContent = people.length ? "No one matches that filter." : "No spend in this window. Try 90 days.";
}
