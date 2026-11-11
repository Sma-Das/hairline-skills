// A value over time, as a running total (line) or per step (bars), on one y scale.
// A limit and a projection share that scale. There is never a second axis.
// Switching the mode or the window eases the same marks to their new values.
import { emptyText, svgEl, watchWidth } from "./charts.js";
import { lerp, reduced, tween } from "./motion.js";
import { hideTip, placeTip, showTip, tipRow, tipTitle } from "./tooltip.js";
import { drawXLabels, drawYGrid, frameOf, pointerAt, prefixSums, show } from "./axes.js";

export function createLineChart(svg, options = {}) {
  const opts = {
    height: 260,
    mode: "running",
    format: (v) => v.toLocaleString("en-US"),
    formatAxis: null,
    words: { each: "that day", running: "running total", limit: "Limit", empty: "Nothing in this window." },
    ...options,
  };
  const formatAxis = opts.formatAxis || opts.format;
  const pad = { l: 52, r: 18, t: 18, b: 26 };
  const state = { points: [], ahead: [], limit: null, projected: null, mode: opts.mode, shown: [], shownMax: 1, cancel: null, width: 0 };
  svg.classList.add("hl-chart");
  svg.setAttribute("role", "img");
  svg.style.height = opts.height + "px";

  const grid = svgEl("g");
  const bars = svgEl("g", { class: "hl-line-bars" });
  const line = svgEl("polyline", { class: "hl-line" });
  const projection = svgEl("line", { class: "hl-projection" });
  const limit = svgEl("line", { class: "hl-limit" });
  const limitLabel = svgEl("text", { class: "hl-limit-label" });
  const endDot = svgEl("circle", { class: "hl-end", r: 4 });
  const endLabel = svgEl("text", { class: "hl-end-label" });
  const xLabels = svgEl("g");
  const rule = svgEl("line", { class: "hl-crosshair" });
  const hoverDot = svgEl("circle", { class: "hl-dot", r: 4 });
  svg.replaceChildren(grid, bars, line, projection, limit, limitLabel, endDot, endLabel, xLabels, rule, hoverDot);
  show(rule, false);
  show(hoverDot, false);

  const daily = () => state.mode === "daily";
  const targets = () => (daily() ? state.points.map((p) => Number(p.value) || 0) : prefixSums(state.points.map((p) => p.value)));
  // The running line reserves room for the steps still to come. Bars show only real steps.
  const steps = () => state.points.length - 1 + (daily() ? 0 : state.ahead.length);

  const geom = (width, max) => {
    const f = frameOf(width, opts.height, pad);
    const n = state.points.length;
    const band = n ? f.innerW / n : f.innerW;
    const s = steps();
    return {
      ...f, band,
      lineX: (i) => pad.l + (s <= 0 ? f.innerW / 2 : (i / s) * f.innerW),
      barX: (i) => pad.l + band * i,
      y: (v) => f.base - (v / max) * f.innerH,
    };
  };

  function syncBars() {
    while (bars.children.length > state.points.length) bars.lastChild.remove();
    while (bars.children.length < state.points.length) bars.appendChild(svgEl("rect", { class: "hl-bar", rx: 2 }));
  }

  function frame(values, max, width) {
    const g = geom(width, max);
    const pts = values.map((v, i) => g.lineX(i).toFixed(1) + "," + g.y(v).toFixed(1));
    if (!daily()) line.setAttribute("points", pts.join(" "));
    const barW = Math.max(1, Math.min(g.band - 2, 40));
    [...bars.children].forEach((bar, i) => {
      const top = g.y(values[i] || 0);
      bar.setAttribute("x", (g.barX(i) + (g.band - barW) / 2).toFixed(1));
      bar.setAttribute("width", barW.toFixed(1));
      bar.setAttribute("y", top.toFixed(1));
      bar.setAttribute("height", Math.max(0, g.base - top).toFixed(1));
    });
    const last = values.length - 1;
    const endX = g.lineX(last);
    const endY = g.y(values[last] || 0);
    endDot.setAttribute("cx", endX.toFixed(1));
    endDot.setAttribute("cy", endY.toFixed(1));
    // The end label flips inside when it would run off the right edge.
    const flip = endX > width - 80;
    endLabel.setAttribute("x", (flip ? endX - 10 : endX + 10).toFixed(1));
    endLabel.setAttribute("y", (endY - 8).toFixed(1));
    endLabel.setAttribute("text-anchor", flip ? "end" : "start");
    endLabel.textContent = opts.format(values[last] || 0);

    const hasLimit = !daily() && state.limit != null;
    show(limit, hasLimit);
    show(limitLabel, hasLimit);
    if (hasLimit) {
      const y = g.y(state.limit);
      Object.entries({ x1: pad.l, x2: width - pad.r, y1: y.toFixed(1), y2: y.toFixed(1) }).forEach(([k, v]) => limit.setAttribute(k, v));
      limitLabel.setAttribute("x", pad.l + 6);
      // Below the line when there is no room above it.
      limitLabel.setAttribute("y", (y < pad.t + 18 ? y + 16 : y - 6).toFixed(1));
      limitLabel.textContent = opts.words.limit + " " + opts.format(state.limit);
    }
    const hasProjection = !daily() && state.ahead.length > 0 && state.projected != null && state.projected > (values[last] || 0);
    show(projection, hasProjection);
    if (hasProjection) {
      projection.setAttribute("x1", endX.toFixed(1));
      projection.setAttribute("y1", endY.toFixed(1));
      projection.setAttribute("x2", (width - pad.r).toFixed(1));
      projection.setAttribute("y2", g.y(state.projected).toFixed(1));
    }
  }

  function render(width, animate) {
    if (!width) return;
    state.width = width;
    svg.setAttribute("viewBox", `0 0 ${width} ${opts.height}`);
    svg.dataset.mode = state.mode;
    const values = targets();
    if (!values.some((v) => v > 0)) {
      grid.replaceChildren(emptyText(width, opts.height, opts.words.empty));
      xLabels.replaceChildren();
      bars.replaceChildren();
      line.setAttribute("points", "");
      [endDot, endLabel, projection, limit, limitLabel].forEach((n) => show(n, false));
      state.shown = [];
      return;
    }
    show(endDot, true);
    show(endLabel, true);
    syncBars();
    // A limit or projection above the data raises the axis, so it is always on the chart.
    const want = daily() ? Math.max(1, ...values) : Math.max(1, ...values, state.limit || 0, state.projected || 0);
    const axisMax = drawYGrid(grid, { width, height: opts.height, pad, max: want, format: formatAxis });
    const labels = state.points.map((p) => p.label).concat(daily() ? [] : state.ahead);
    const g = geom(width, 1);
    drawXLabels(xLabels, { labels, xAt: g.lineX, y: opts.height - 6, innerW: g.innerW });

    state.cancel?.();
    // Same length: ease from what is on screen. New length: rise from the baseline.
    const from = state.shown.length === values.length ? state.shown : null;
    if (animate && !reduced()) {
      const start = from || values.map(() => 0);
      const startMax = from ? state.shownMax : axisMax;
      state.cancel = tween(from ? 280 : 360, (t) => {
        const now = values.map((v, i) => lerp(start[i], v, t));
        const max = lerp(startMax, axisMax, t);
        frame(now, max, width);
        state.shown = now;
        state.shownMax = max;
      });
    } else {
      frame(values, axisMax, width);
      state.shown = values;
      state.shownMax = axisMax;
    }
  }

  const watch = watchWidth(svg, (width) => render(width, !state.width));

  function indexAt(event) {
    const at = pointerAt(svg, event, state.width);
    const n = state.points.length;
    if (!at || !n) return -1;
    const g = geom(state.width, 1);
    if (daily()) return Math.max(0, Math.min(n - 1, Math.floor((at.x - pad.l) / g.band)));
    const s = steps();
    if (s <= 0) return 0;
    return Math.max(0, Math.min(n - 1, Math.round(((at.x - pad.l) / g.innerW) * s)));
  }

  let hovered = -1;
  const unhot = () => bars.children[hovered]?.classList.remove("is-hot");
  const clear = () => {
    show(rule, false);
    show(hoverDot, false);
    unhot();
    bars.classList.remove("has-hot");
    hovered = -1;
    hideTip();
  };
  const onMove = (event) => {
    const index = indexAt(event);
    if (index < 0) return;
    if (index === hovered) { placeTip(event.clientX, event.clientY); return; }
    unhot();
    hovered = index;
    const g = geom(state.width, state.shownMax || 1);
    const run = prefixSums(state.points.map((p) => p.value))[index];
    const point = state.points[index];
    if (daily()) {
      bars.classList.add("has-hot");
      bars.children[index]?.classList.add("is-hot");
    } else {
      const x = g.lineX(index).toFixed(1);
      Object.entries({ x1: x, x2: x, y1: pad.t, y2: g.base.toFixed(1) }).forEach(([k, v]) => rule.setAttribute(k, v));
      hoverDot.setAttribute("cx", x);
      hoverDot.setAttribute("cy", g.y(run).toFixed(1));
      show(rule, true);
      show(hoverDot, true);
    }
    showTip([tipTitle(point.label), tipRow(opts.format(Number(point.value) || 0), opts.words.each), tipRow(opts.format(run), opts.words.running)], event.clientX, event.clientY);
  };
  svg.addEventListener("pointermove", onMove);
  // A tap shows the same tooltip on touch.
  svg.addEventListener("pointerdown", onMove);
  svg.addEventListener("pointerleave", clear);
  svg.addEventListener("pointercancel", clear);

  return {
    // points: [{ label, value }]. ahead: labels of steps still to come (for the projection).
    update({ points = [], ahead = [], limit: cap = null, projected = null, label = "" } = {}) {
      state.points = points;
      state.ahead = ahead;
      state.limit = Number.isFinite(Number(cap)) && cap != null ? Number(cap) : null;
      state.projected = projected;
      if (label) svg.setAttribute("aria-label", label);
      render(watch.width, true);
    },
    setMode(mode) {
      state.mode = mode;
      clear();
      render(watch.width, true);
    },
    destroy() {
      state.cancel?.();
      watch.disconnect();
    },
  };
}
