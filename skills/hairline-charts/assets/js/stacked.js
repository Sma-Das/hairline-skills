// Several series stacked over time. The legend isolates one series and the bands ease
// to their new place. A 1px page-colored stroke separates neighbors, and the legend and
// tooltip name every series, so identity never rests on color alone.
import { emptyText, svgEl, watchWidth } from "./charts.js";
import { lerp, reduced, tween } from "./motion.js";
import { hideTip, placeTip, showTip, tipRow, tipTitle } from "./tooltip.js";
import { drawXLabels, drawYGrid, frameOf, pointerAt, prefixSums, show } from "./axes.js";

export function createStackedChart(svg, legendHost, options = {}) {
  const opts = {
    height: 280,
    mode: "daily",
    format: (v) => v.toLocaleString("en-US"),
    formatAxis: null,
    onPick: null,
    words: { total: "total", running: "running total", only: "Show only", empty: "Nothing in this window." },
    ...options,
  };
  const formatAxis = opts.formatAxis || opts.format;
  const pad = { l: 52, r: 14, t: 12, b: 26 };
  const state = { labels: [], series: [], mode: opts.mode, solo: null, shown: null, shownMax: 1, shownLength: 0, cancel: null, width: 0 };
  svg.classList.add("hl-chart");
  svg.setAttribute("role", "img");
  svg.style.height = opts.height + "px";
  const grid = svgEl("g");
  const bands = svgEl("g", { class: "hl-bands" });
  const xLabels = svgEl("g");
  const rule = svgEl("line", { class: "hl-crosshair" });
  show(rule, false);
  svg.replaceChildren(grid, bands, xLabels, rule);

  const visible = () => state.series.filter((s) => !state.solo || s.key === state.solo);
  const valuesOf = (s) => (state.mode === "running" ? prefixSums(s.values) : s.values.map((v) => Number(v) || 0));

  // Every series keeps a layer, hidden ones at zero height, so a band that comes back
  // grows from where it sits in the stack instead of appearing.
  function layers() {
    const list = visible();
    const base = new Array(state.labels.length).fill(0);
    const out = new Map();
    state.series.forEach((s) => {
      const lower = base.slice();
      if (list.includes(s)) valuesOf(s).forEach((v, i) => { base[i] += v; });
      out.set(s.key, { lower, upper: base.slice() });
    });
    return { out, max: Math.max(1, ...base) };
  }

  const geom = (width, max) => {
    const f = frameOf(width, opts.height, pad);
    const n = state.labels.length;
    return { ...f, x: (i) => pad.l + (n <= 1 ? f.innerW / 2 : (i / (n - 1)) * f.innerW), y: (v) => f.base - (v / max) * f.innerH };
  };

  function pathOf(layer, g) {
    if (!layer.upper.length) return "";
    const top = layer.upper.map((v, i) => `${g.x(i).toFixed(1)},${g.y(v).toFixed(1)}`);
    const bottom = layer.lower.map((v, i) => `${g.x(i).toFixed(1)},${g.y(v).toFixed(1)}`).reverse();
    return "M" + top.join("L") + "L" + bottom.join("L") + "Z";
  }

  // Bands are keyed, so a series keeps its node (and its motion) across updates.
  function syncBands() {
    const keep = new Set(state.series.map((s) => s.key));
    [...bands.children].forEach((node) => { if (!keep.has(node.dataset.key)) node.remove(); });
    state.series.forEach((s) => {
      let path = bands.querySelector(`[data-key="${CSS.escape(s.key)}"]`);
      if (!path) {
        path = svgEl("path", { class: "hl-band" });
        path.dataset.key = s.key;
        path.addEventListener("click", () => { if (opts.onPick && !path._series.other) opts.onPick(path._series); });
      }
      path._series = s;
      path.style.fill = s.color;
      path.classList.toggle("is-clickable", !!opts.onPick && !s.other);
      bands.appendChild(path);
    });
  }

  function frame(lay, max, width) {
    const g = geom(width, max);
    [...bands.children].forEach((path) => {
      const layer = lay.get(path.dataset.key);
      path.setAttribute("d", layer ? pathOf(layer, g) : "");
    });
  }

  function render(width, animate) {
    if (!width) return;
    state.width = width;
    svg.setAttribute("viewBox", `0 0 ${width} ${opts.height}`);
    syncBands();
    const n = state.labels.length;
    if (!state.series.length || !n) {
      grid.replaceChildren(emptyText(width, opts.height, opts.words.empty));
      xLabels.replaceChildren();
      state.shown = null;
      return;
    }
    const { out, max } = layers();
    const top = drawYGrid(grid, { width, height: opts.height, pad, max, format: formatAxis });
    const g = geom(width, top);
    drawXLabels(xLabels, { labels: state.labels, xAt: g.x, y: opts.height - 6, innerW: g.innerW });

    state.cancel?.();
    const same = state.shown && state.shownLength === n;
    if (animate && !reduced()) {
      // New bands, or a window of a new length, rise from the baseline.
      const zero = new Array(n).fill(0);
      const from = new Map();
      out.forEach((_, key) => from.set(key, (same && state.shown.get(key)) || { lower: zero, upper: zero }));
      const startMax = same ? state.shownMax : top;
      state.cancel = tween(same ? 280 : 360, (t) => {
        const now = new Map();
        out.forEach((layer, key) => {
          const a = from.get(key);
          now.set(key, { lower: layer.lower.map((v, i) => lerp(a.lower[i], v, t)), upper: layer.upper.map((v, i) => lerp(a.upper[i], v, t)) });
        });
        const axis = lerp(startMax, top, t);
        frame(now, axis, width);
        state.shown = now;
        state.shownMax = axis;
        state.shownLength = n;
      });
    } else {
      frame(out, top, width);
      state.shown = out;
      state.shownMax = top;
      state.shownLength = n;
    }
  }

  function paintLegend() {
    if (!legendHost) return;
    legendHost.classList.add("hl-legend");
    legendHost.classList.toggle("is-solo", !!state.solo);
    legendHost.replaceChildren();
    state.series.forEach((s) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "hl-legend-item";
      btn.style.setProperty("--c", s.color);
      btn.setAttribute("aria-pressed", state.solo === s.key ? "true" : "false");
      btn.append(document.createElement("i"), document.createTextNode(s.label));
      btn.title = s.other && s.members ? s.members.join(", ") : opts.words.only + " " + s.label;
      btn.addEventListener("click", () => {
        state.solo = state.solo === s.key ? null : s.key;
        paintLegend();
        render(watch.width, true);
      });
      // Hovering a legend entry lights its band, the same way hovering the band would.
      btn.addEventListener("pointerenter", () => {
        bands.classList.add("has-hot");
        bands.querySelector(`[data-key="${CSS.escape(s.key)}"]`)?.classList.add("is-hot");
      });
      btn.addEventListener("pointerleave", () => {
        bands.classList.remove("has-hot");
        bands.querySelectorAll(".is-hot").forEach((node) => node.classList.remove("is-hot"));
      });
      legendHost.appendChild(btn);
    });
  }

  const watch = watchWidth(svg, (width) => render(width, !state.width));

  let hovered = -1;
  const clear = () => { show(rule, false); hovered = -1; hideTip(); };
  const onMove = (event) => {
    const n = state.labels.length;
    const at = pointerAt(svg, event, state.width);
    if (!at || !n) return;
    const g = geom(state.width, 1);
    const index = n === 1 ? 0 : Math.max(0, Math.min(n - 1, Math.round(((at.x - pad.l) / g.innerW) * (n - 1))));
    if (index === hovered) { placeTip(event.clientX, event.clientY); return; }
    hovered = index;
    const x = g.x(index).toFixed(1);
    Object.entries({ x1: x, x2: x, y1: pad.t, y2: g.base.toFixed(1) }).forEach(([k, v]) => rule.setAttribute(k, v));
    show(rule, true);
    const running = state.mode === "running";
    // Largest first, zeros left out, and the sum on top.
    const rows = visible().map((s) => ({ s, value: valuesOf(s)[index] })).filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
    const sum = rows.reduce((total, r) => total + r.value, 0);
    showTip([
      tipTitle(state.labels[index], running ? opts.words.running : ""),
      tipRow(opts.format(sum), opts.words.total),
      ...rows.map((r) => tipRow(opts.format(r.value), r.s.label, r.s.color)),
    ], event.clientX, event.clientY);
  };
  svg.addEventListener("pointermove", onMove);
  svg.addEventListener("pointerdown", onMove);
  svg.addEventListener("pointerleave", clear);
  svg.addEventListener("pointercancel", clear);

  return {
    // labels: x labels. series: [{ key, label, color, values, other?, members? }], bottom first.
    update(labels, series, { label = "" } = {}) {
      state.labels = labels || [];
      state.series = series || [];
      if (state.solo && !state.series.some((s) => s.key === state.solo)) state.solo = null;
      if (label) svg.setAttribute("aria-label", label);
      paintLegend();
      render(watch.width, true);
    },
    setMode(mode) {
      state.mode = mode;
      render(watch.width, true);
    },
    destroy() {
      state.cancel?.();
      watch.disconnect();
    },
  };
}
