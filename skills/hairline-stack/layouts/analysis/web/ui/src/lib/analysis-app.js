import { createApi, createCache } from "./data.js";
import { dayRange, money } from "./format.js";
import { familyColor } from "../hairline/js/family.js";
import { createFilterRail, renderDataNotes } from "../hairline/js/workspace.js";
import { parseViewState, viewURL } from "../hairline/js/view-state.js";
import { exportChart } from "../hairline/js/export.js";
import { readPref, writePref } from "../hairline/js/ui.js";
import { setTheme } from "../hairline/js/motion.js";
import { createShareChart, createBalanceChart } from "../hairline/js/share.js";
import { balanceData, shareData } from "../hairline/js/analysis.js";

export function startAnalysis() {
  const $ = (id) => document.getElementById(id);
  const root = document.body;
  const controller = new AbortController();
  const on = (node, event, callback) => node.addEventListener(event, callback, { signal: controller.signal });
  const api = createApi(), cache = createCache();
  const options = { charts: ["share", "balance"], days: [7, 30, 90], groups: [] };
  let view = parseViewState(location.search, options);
  let payload = null, chart = null, chartMode = null, version = 0, destroyed = false, loading = false;
  let colorMode = ["family", "vivid"].includes(readPref("app.analysis-colors", "family")) ? readPref("app.analysis-colors", "family") : "family";
  const filters = new Map();
  const rail = createFilterRail({ rail: $("filter-rail"), dialog: $("filter-dialog"), trigger: $("filters-open"), content: $("filter-content"), closeButton: $("filters-done") });
  const theme = () => root.dataset.theme === "light" ? "light" : "dark";
  const color = (row, index) => colorMode === "family" ? familyColor(row.key, row.family, { theme: theme(), tone: row.tone }) : `var(--hl-data-${index % 8 + 1})`;
  const rows = () => (payload?.series || []).map((row, index) => ({ ...row, color: color(row, index) }));
  const currentSeries = () => {
    const series = rows();
    return view.chart === "balance" ? series.length >= 2 ? series.slice(0, 2) : [] : series.filter((row) => view.groups.includes(row.key));
  };
  const error = (message) => { $("analysis-error-text").textContent = message; $("analysis-error").hidden = false; };

  function saveView(next) {
    const oldDays = view.days;
    view = { ...view, ...next };
    const url = viewURL(location.href, view, options);
    if (url !== location.href) history.pushState(null, "", url);
    if (view.days !== oldDays) load(); else paint();
  }
  function exportsEnabled() {
    const enabled = !loading && chart && currentSeries().length > 0;
    $("export-svg").disabled = !enabled; $("export-png").disabled = !enabled;
  }
  function paintFilters() {
    for (const [key, node] of filters) if (!options.groups.includes(key)) { node.label.remove(); filters.delete(key); }
    rows().forEach((row) => {
      let node = filters.get(row.key);
      if (!node) {
        const label = document.createElement("label"); label.className = "hl-filter-option";
        const input = document.createElement("input"); input.type = "checkbox";
        const swatch = document.createElement("i"); swatch.setAttribute("aria-hidden", "true");
        const name = document.createElement("span"); label.append(input, swatch, name);
        on(input, "change", () => saveView({ groups: input.checked ? options.groups.filter((key) => key === row.key || view.groups.includes(key)) : view.groups.filter((key) => key !== row.key) }));
        node = { label, input, swatch, name }; filters.set(row.key, node); $("team-filters").append(label);
      }
      node.input.checked = view.groups.includes(row.key); node.name.textContent = row.label; node.swatch.style.setProperty("--c", row.color);
    });
    for (const id of ["filter-count", "mobile-filter-count"]) $(id).textContent = String(view.groups.length);
  }
  function comparison({ index, data }) {
    if (view.chart !== "balance" || data.series.length < 2) return;
    const at = index ?? data.totals.findLastIndex((total) => total != null);
    const [left, right] = data.series;
    const lead = at >= 0 ? balanceData(left.raw, right.raw)[at] : null;
    $("left-name").textContent = left.label; $("right-name").textContent = right.label;
    $("left-share").textContent = at >= 0 && left.values[at] != null ? left.values[at].toFixed(1) + "%" : "—";
    $("right-share").textContent = at >= 0 && right.values[at] != null ? right.values[at].toFixed(1) + "%" : "—";
    $("left-share").style.setProperty("--c", left.color); $("right-share").style.setProperty("--c", right.color);
    $("comparison-lead").textContent = lead == null ? "—" : (lead > 0 ? "+" : "") + lead.toFixed(1) + "pp";
    $("comparison-date").textContent = at >= 0 ? (index == null ? "Latest: " : "") + payload.days[at].day : "No observations";
    $("comparison-direction").textContent = lead == null ? "No observations" : lead === 0 ? "Even" : (lead > 0 ? left.label : right.label) + " leads";
  }
  function paint({ preserveInspection = false } = {}) {
    $("analysis-days").value = String(view.days); $("analysis-colors").value = colorMode;
    $("analysis-theme").textContent = theme() === "dark" ? "Light" : "Dark";
    for (const mode of options.charts) {
      const link = $(mode + "-view"); link.href = viewURL(location.href, { ...view, chart: mode }, options);
      if (mode === view.chart) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current");
    }
    if (!payload) return;
    paintFilters();
    $("analysis-title").textContent = view.chart === "share" ? "Cost by team" : "Team comparison";
    $("analysis-scope").textContent = dayRange(payload.from, payload.to) + " · UTC";
    $("selection-scope").textContent = view.chart === "share" ? view.groups.length + " teams selected" : "Fixed two-team comparison";
    const series = currentSeries();
    $("comparison-values").hidden = view.chart !== "balance" || series.length < 2;
    $("comparison-scope").textContent = view.chart === "balance" ? `Comparison uses ${series.map((row) => row.label).join(" and ")} regardless of team filters. Zero is an even split; +20pp means 60% versus 40%.` : "Period shares are weighted by observed cost. Changes are first-to-last observed-day percentage points.";
    if (chartMode !== view.chart) {
      chart?.destroy(); chartMode = view.chart;
      chart = (view.chart === "balance" ? createBalanceChart : createShareChart)($("analysis-chart"), $("analysis-ranking"), { format: money, readout: $("analysis-readout"), live: $("analysis-live"), onInspect: comparison });
    }
    chart.update(payload.days.map((row) => row.day), series, { label: view.chart === "share" ? "Daily charged-cost share by team" : "Two-team share difference in percentage points", preserveInspection });
    const data = shareData(series, payload.days.length);
    renderDataNotes($("analysis-notes"), {
      source: { label: payload.source_label }, updatedAt: payload.updated_at,
      coverage: { reported: data.completeDays, total: payload.days.length, label: "Comparable days" },
      methodology: "Period share is each selected team's charged cents divided by the selected total across complete observed days. Missing observations and all-zero totals are gaps. Share changes compare the first and last observed days. The sample command generates invented records; a real store must supply its own series, source, and freshness.",
    });
    exportsEnabled();
  }
  async function load() {
    const mine = ++version, path = "/v1/summary?days=" + view.days;
    api.clear(); loading = true; $("analysis-error").hidden = true; exportsEnabled();
    const apply = (value) => {
      if (!Array.isArray(value.days) || (value.series && !Array.isArray(value.series))) throw new Error("The analysis response is incomplete.");
      payload = value; options.groups = (value.series || []).map((row) => row.key);
      view = parseViewState(location.search, options); paint();
    };
    const hit = cache.get(path);
    const timer = setTimeout(() => { if (mine === version) $("analysis-main").classList.add("is-refreshing"); }, 450);
    try {
      if (hit) apply(hit.payload);
      if (!hit?.fresh) {
        const value = await api(path); cache.set(path, value);
        if (!destroyed && mine === version) apply(value);
      }
    } catch (err) { if (!destroyed && mine === version && err.name !== "AbortError") error("Could not load the analysis. " + err.message); }
    finally {
      clearTimeout(timer);
      if (!destroyed && mine === version) { loading = false; $("analysis-main").classList.remove("is-refreshing"); exportsEnabled(); }
    }
  }
  for (const mode of options.charts) on($(mode + "-view"), "click", (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); saveView({ chart: mode });
  });
  on($("analysis-days"), "change", (event) => saveView({ days: Number(event.target.value) }));
  on($("analysis-colors"), "change", (event) => { colorMode = event.target.value; writePref("app.analysis-colors", colorMode); paint({ preserveInspection: true }); });
  on($("analysis-theme"), "click", () => { setTheme(root, theme() === "dark" ? "light" : "dark"); paint({ preserveInspection: true }); });
  for (const id of ["filters-all", "filters-reset"]) on($(id), "click", () => saveView({ groups: [...options.groups] }));
  on($("filters-clear"), "click", () => saveView({ groups: [] }));
  on($("analysis-retry"), "click", () => { cache.clear(); load(); });
  on(window, "popstate", () => {
    const next = parseViewState(location.search, options); const changed = next.days !== view.days; view = next;
    if (changed) load(); else paint();
  });
  on($("copy-view"), "click", async () => {
    const url = viewURL(location.href, view, options);
    try { await navigator.clipboard.writeText(url); $("analysis-live").textContent = "View link copied."; }
    catch { const input = $("share-link"); input.hidden = false; input.value = url; input.focus(); input.select(); $("analysis-live").textContent = "Copy the selected view link."; }
  });
  for (const format of ["svg", "png"]) on($("export-" + format), "click", async () => {
    $("export-svg").disabled = $("export-png").disabled = true;
    try {
      await exportChart($("analysis-chart"), {
        format, filename: "analysis-" + view.chart + "-" + view.days + "days",
        title: $("analysis-title").textContent, description: $("analysis-scope").textContent + " · " + $("selection-scope").textContent,
        rows: chart.rows().map((row) => ({ label: row.label, value: row.share == null ? "No observations" : row.share.toFixed(1) + "%" + (row.changePp == null ? "" : " (" + (row.changePp > 0 ? "+" : "") + row.changePp.toFixed(1) + "pp)") })),
        notes: [$("analysis-readout").textContent.split(". Arrow keys")[0], $("comparison-scope").textContent, $("analysis-notes").innerText.split("Data and methodology")[0]],
      });
      $("analysis-live").textContent = format.toUpperCase() + " download started.";
    } catch (err) { error("Could not save the chart. " + err.message); }
    finally { if (!destroyed) exportsEnabled(); }
  });
  paint(); load();
  return () => { destroyed = true; version++; api.clear(); chart?.destroy(); rail.destroy(); controller.abort(); };
}
