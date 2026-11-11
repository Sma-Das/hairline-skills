import { emptyText, svgEl, watchWidth } from "./charts.js";
import { drawXLabels, frameOf, pointerAt } from "./axes.js";
import { balanceData, observedRuns, rankShares, shareData } from "./analysis.js";

let nextId = 0;
const percent = (value) => value == null ? "—" : value.toFixed(1) + "%";
const change = (value) => value == null ? "" : (value > 0 ? "+" : "") + value.toFixed(1) + "pp";
const element = (tag, className, text) => {
  const node = document.createElement(tag);
  node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

// A date-inspection slider and a linked, keyboard-operable ranking. Period share is
// volume weighted. Pointer inspection never moves the ranking under the pointer.
export function createShareChart(svg, ranking, options = {}) {
  const opts = { height: 360, mode: "share", format: String, readout: null, live: null, onInspect: null, ...options };
  const state = { labels: [], series: [], data: shareData([]), index: null, pinned: false, pinnedKey: null, hot: null, width: 0 };
  const pad = { l: 46, r: 14, t: 16, b: 28 };
  const controller = new AbortController();
  const listen = (node, type, handler) => node.addEventListener(type, handler, { signal: controller.signal });
  const id = "hl-balance-" + (++nextId);
  const defs = svgEl("defs");
  const grid = svgEl("g");
  const marks = svgEl("g", { class: "hl-share-bands" });
  const labels = svgEl("g");
  const cursor = svgEl("line", { class: "hl-crosshair", display: "none" });
  svg.classList.add("hl-chart", "hl-analysis-chart");
  svg.style.height = opts.height + "px";
  svg.setAttribute("tabindex", "0");
  svg.setAttribute("aria-orientation", "horizontal");
  svg.replaceChildren(defs, grid, marks, labels, cursor);
  const heading = element("div", "hl-ranking-heading");
  const periodLabel = element("span", "", "Period share");
  heading.append(periodLabel, element("span", "", "Share · change"));
  const list = element("div", "hl-ranking-list");
  ranking.replaceChildren(heading, list);
  const buttons = new Map();

  const geometry = () => {
    const f = frameOf(state.width, opts.height, pad);
    return { ...f, x: (i) => pad.l + (state.labels.length < 2 ? f.innerW / 2 : i * f.innerW / (state.labels.length - 1)), y: (value) => opts.mode === "balance" ? f.top + (100 - value) * f.innerH / 200 : f.base - value * f.innerH / 100 };
  };

  function highlight(key) {
    state.hot = key;
    marks.classList.toggle("has-hot", key != null);
    for (const node of marks.children) node.classList.toggle("is-hot", node.dataset.key === key);
    for (const [id, button] of buttons) {
      button.classList.toggle("is-hot", id === key);
      button.setAttribute("aria-pressed", String(id === state.pinnedKey));
    }
  }

  function readout(announce = false) {
    const rows = rankShares(state.data, state.index);
    const byKey = new Map(rows.map((row) => [row.key, row]));
    for (const [key, button] of buttons) {
      const row = byKey.get(key);
      button._value.textContent = percent(row?.share);
      button._delta.textContent = change(row?.changePp);
      button._bar.style.setProperty("--share", String((row?.share || 0) / 100));
      button.setAttribute("aria-label", `${row?.label || key}: ${percent(row?.share)}${row?.changePp == null ? "" : ", change " + change(row.changePp)}. ${state.pinnedKey === key ? "Unpin" : "Pin"} series.`);
    }
    const at = state.index;
    const gap = at != null && state.data.totals[at] == null;
    periodLabel.textContent = at == null ? "Period share" : state.labels[at];
    const phrase = at == null ? `Period share · ${state.data.completeDays}/${state.labels.length} observed days` : `${state.pinned ? "Pinned: " : ""}${state.labels[at]} · ${gap ? "No observations" : opts.format(state.data.totals[at])}`;
    if (opts.readout) opts.readout.textContent = phrase + ". Arrow keys inspect dates; Enter pins; Escape resets.";
    if (announce && opts.live) opts.live.textContent = phrase;
    if (at == null || !state.width) cursor.setAttribute("display", "none");
    else {
      const g = geometry();
      for (const [key, value] of Object.entries({ x1: g.x(at), x2: g.x(at), y1: pad.t, y2: g.base })) cursor.setAttribute(key, value);
      cursor.removeAttribute("display");
    }
    const n = state.labels.length;
    svg.setAttribute("role", n ? "slider" : "img");
    if (n) {
      svg.setAttribute("aria-valuemin", "0"); svg.setAttribute("aria-valuemax", String(n - 1));
      svg.setAttribute("aria-valuenow", String(at ?? n - 1));
      svg.setAttribute("aria-valuetext", phrase + ". " + rows.map((row) => row.label + " " + percent(row.share)).join(", "));
    } else for (const name of ["aria-valuemin", "aria-valuemax", "aria-valuenow", "aria-valuetext"]) svg.removeAttribute(name);
    opts.onInspect?.({ index: at, pinned: state.pinned, rows, data: state.data });
  }

  function syncRanking() {
    const focused = list.contains(document.activeElement) ? document.activeElement : null;
    const rows = rankShares(state.data);
    const keep = new Set(rows.map((row) => row.key));
    for (const [key, button] of buttons) if (!keep.has(key)) { button.remove(); buttons.delete(key); }
    rows.forEach((row, index) => {
      let button = buttons.get(row.key);
      if (!button) {
        button = element("button", "hl-rank-row"); button.type = "button";
        button._place = element("span", "hl-rank-place");
        const main = element("span", "hl-rank-name");
        button._name = element("span", ""); button._bar = element("i", "hl-rank-bar");
        button._bar.setAttribute("aria-hidden", "true"); main.append(button._name, button._bar);
        const numbers = element("span", "hl-rank-numbers");
        button._value = element("span", ""); button._delta = element("span", "hl-rank-delta");
        numbers.append(button._value, button._delta); button.append(button._place, main, numbers);
        listen(button, "pointerenter", () => highlight(state.pinnedKey || row.key));
        listen(button, "pointerleave", () => highlight(state.pinnedKey));
        listen(button, "focus", () => { svg.dataset.input = "keyboard"; highlight(row.key); });
        listen(button, "blur", () => highlight(state.pinnedKey));
        listen(button, "click", () => { state.pinnedKey = state.pinnedKey === row.key ? null : row.key; highlight(state.pinnedKey); });
        buttons.set(row.key, button);
      }
      button._place.textContent = index + 1;
      button._name.textContent = row.label;
      button.style.setProperty("--c", row.color);
      // Appending a focused node can lose focus in some engines; move only if needed.
      if (list.children[index] !== button) list.insertBefore(button, list.children[index] || null);
    });
    if (focused?.isConnected && document.activeElement !== focused) focused.focus({ preventScroll: true });
    highlight(state.pinnedKey);
    readout();
  }

  function paint() {
    if (!state.width) return;
    const g = geometry();
    svg.setAttribute("viewBox", `0 0 ${state.width} ${opts.height}`);
    defs.replaceChildren(); grid.replaceChildren(); marks.replaceChildren(); labels.replaceChildren();
    const runs = observedRuns(state.data.totals);
    if (!runs.length) {
      grid.append(emptyText(state.width, opts.height, "No observations in this selection."));
      readout(); return;
    }
    const ticks = opts.mode === "balance" ? [-100, -50, 0, 50, 100] : [0, 25, 50, 75, 100];
    for (const value of ticks) grid.append(
      svgEl("line", { class: value === 0 ? "hl-baseline" : "hl-gridline", x1: pad.l, x2: g.right, y1: g.y(value), y2: g.y(value) }),
      svgEl("text", { x: pad.l - 7, y: g.y(value) + 4, "text-anchor": "end" }, opts.mode === "balance" ? value === 0 ? "Even" : (value > 0 ? "+" : "") + value : value + "%")
    );
    drawXLabels(labels, { labels: state.labels, xAt: g.x, y: opts.height - 6, innerW: g.innerW });
    if (opts.mode === "balance") {
      const [left, right] = state.series;
      if (!left || !right) return;
      const values = balanceData(left.values, right.values);
      for (const [suffix, y, height, row] of [["positive", pad.t, g.innerH / 2, left], ["negative", g.y(0), g.innerH / 2, right]]) {
        const clip = svgEl("clipPath", { id: id + suffix });
        clip.append(svgEl("rect", { x: pad.l, y, width: g.innerW, height })); defs.append(clip);
        const group = svgEl("g", { "clip-path": `url(#${id + suffix})` }); group.dataset.key = row.key;
        for (const run of observedRuns(values)) {
          const line = "M" + run.map((i) => `${g.x(i)},${g.y(values[i])}`).join("L");
          const area = line + `L${g.x(run.at(-1))},${g.y(0)}L${g.x(run[0])},${g.y(0)}Z`;
          group.append(svgEl("path", { d: area, fill: row.color, opacity: ".12" }), svgEl("path", { d: line, fill: "none", stroke: row.color, "stroke-width": "2", "stroke-linejoin": "round" }));
        }
        marks.append(group);
      }
      const last = observedRuns(values).flat().at(-1);
      if (last != null) marks.append(svgEl("circle", { cx: g.x(last), cy: g.y(values[last]), r: 3.5, fill: values[last] >= 0 ? left.color : right.color }));
    } else {
      const lower = new Array(state.labels.length).fill(0);
      for (const row of state.data.series) {
        const upper = lower.map((value, i) => value + (row.values[i] || 0));
        for (const run of runs) {
          const points = run.map((i) => [g.x(i), g.y(upper[i])]);
          const bottom = [...run].reverse().map((i) => [g.x(i), g.y(lower[i])]);
          // Give a single observed day a visible, narrow column instead of a zero-width area.
          if (run.length === 1) { points[0][0] -= 2; points.push([g.x(run[0]) + 2, g.y(upper[run[0]])]); bottom[0][0] += 2; bottom.push([g.x(run[0]) - 2, g.y(lower[run[0]])]); }
          const path = svgEl("path", { class: "hl-band", d: "M" + points.concat(bottom).map((p) => p.join(",")).join("L") + "Z", fill: row.color });
          path.dataset.key = row.key; marks.append(path);
        }
        lower.splice(0, lower.length, ...upper);
      }
    }
    highlight(state.hot || state.pinnedKey); readout();
  }

  function inspect(index, { pin = state.pinned, announce = false } = {}) {
    if (!state.labels.length) return;
    state.index = index == null ? null : Math.max(0, Math.min(state.labels.length - 1, index));
    state.pinned = pin && index != null;
    readout(announce);
  }
  const pointerIndex = (event) => {
    const p = pointerAt(svg, event, state.width);
    return p ? Math.round((p.x - pad.l) / geometry().innerW * (state.labels.length - 1)) : null;
  };
  listen(svg, "pointermove", (event) => {
    if (event.pointerType === "touch") return;
    svg.dataset.input = "pointer";
    highlight(state.pinnedKey || event.target.closest("[data-key]")?.dataset.key || null);
    if (!state.pinned) inspect(pointerIndex(event));
  });
  listen(svg, "pointerdown", (event) => { if (event.button === 0) { svg.dataset.input = "pointer"; inspect(pointerIndex(event), { pin: true, announce: true }); } });
  listen(svg, "pointerleave", () => { highlight(state.pinnedKey); if (!state.pinned) inspect(null); });
  listen(svg, "keydown", (event) => {
    const current = state.index ?? state.labels.length - 1;
    if (!["ArrowLeft", "ArrowRight", "Home", "End", "Enter", " ", "Escape"].includes(event.key)) return;
    event.preventDefault(); svg.dataset.input = "keyboard";
    if (event.key === "Escape") { state.pinnedKey = null; highlight(null); inspect(null, { pin: false, announce: true }); }
    else if (["Enter", " "].includes(event.key)) inspect(current, { pin: !state.pinned, announce: true });
    else inspect(event.key === "Home" ? 0 : event.key === "End" ? state.labels.length - 1 : current + (event.key === "ArrowRight" ? 1 : -1), { pin: true, announce: true });
  });
  listen(ranking, "keydown", (event) => { if (event.key === "Escape") { state.pinnedKey = null; highlight(null); inspect(null, { pin: false, announce: true }); } });
  const watch = watchWidth(svg, (width) => { state.width = width; paint(); });
  return {
    update(labels, series, { label = "Share by date", preserveInspection = false } = {}) {
      const data = shareData(series, labels.length);
      if (opts.mode === "balance" && series.length !== 0 && series.length !== 2) throw new TypeError("A balance chart needs exactly two series.");
      state.labels = [...labels]; state.series = series; state.data = data;
      if (!preserveInspection || state.index >= labels.length) { state.index = null; state.pinned = false; }
      if (!series.some((row) => row.key === state.pinnedKey)) state.pinnedKey = null;
      svg.setAttribute("aria-label", label); syncRanking(); state.width = watch.width; paint();
    },
    inspect,
    rows: () => rankShares(state.data, state.index),
    destroy() { controller.abort(); watch.disconnect(); },
  };
}

export function createBalanceChart(svg, ranking, options = {}) {
  return createShareChart(svg, ranking, { ...options, mode: "balance" });
}
