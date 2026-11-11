// Totals per period as bars, with the running total as a line, on one y scale, so a
// running point never sits below its own bar. The running line can be turned off,
// because it soon dwarfs any one period. Bars rise and the line draws in once, the
// first time the chart is seen. Later repaints do not replay it.
import { emptyText, niceTicks, svgEl, watchWidth } from "./charts.js";
import { reduced, tween } from "./motion.js";
import { hideTip, placeTip, showTip, tipRow, tipTitle } from "./tooltip.js";
import { pointerAt, prefixSums } from "./axes.js";

export function createComboChart(svg, options = {}) {
  const opts = {
    height: 280,
    format: (v) => v.toLocaleString("en-US"),
    formatAxis: null,
    words: { each: "this period", running: "running total", so_far: "so far", on: "on", empty: "Nothing yet." },
    ...options,
  };
  const formatAxis = opts.formatAxis || opts.format;
  const state = { rows: [], signature: "", grown: false, cancel: null, running: true };
  svg.classList.add("hl-chart");
  svg.setAttribute("role", "img");
  svg.style.height = opts.height + "px";

  function render(width) {
    if (!width) return;
    const rows = state.rows;
    // Skip a repaint that would draw the same thing. It also keeps hover state.
    const signature = width + "|" + state.running + "|" + rows.map((r) => r.label + ":" + r.value).join(",");
    if (signature === state.signature) return;
    state.signature = signature;
    svg.setAttribute("viewBox", `0 0 ${width} ${opts.height}`);
    if (!rows.length) { svg.replaceChildren(emptyText(width, opts.height, opts.words.empty)); return; }
    const animate = !state.grown && !reduced();
    state.grown = true;

    const totals = prefixSums(rows.map((r) => r.value));
    const pad = { l: 56, r: 12, t: 14, b: 38 };
    const innerW = Math.max(40, width - pad.l - pad.r);
    const innerH = opts.height - pad.t - pad.b;
    const base = pad.t + innerH;
    const ticks = niceTicks(Math.max(...rows.map((r, i) => (state.running ? Math.max(r.value, totals[i]) : r.value))), 4);
    const axisMax = ticks[ticks.length - 1] || 1;
    const y = (v) => base - (v / axisMax) * innerH;
    const band = innerW / rows.length;
    const barW = Math.min(56, Math.max(4, band * 0.62));
    // Label every period that has 36px of room; the rest are in the tooltip.
    const every = Math.max(1, Math.ceil(36 / band));
    const cx = (i) => pad.l + band * (i + 0.5);

    svg.replaceChildren();
    ticks.forEach((v) => {
      const at = y(v).toFixed(1);
      svg.append(
        svgEl("line", { class: v === 0 ? "hl-baseline" : "hl-gridline", x1: pad.l, x2: width - pad.r, y1: at, y2: at }),
        svgEl("text", { x: pad.l - 8, y: (y(v) + 4).toFixed(1), "text-anchor": "end" }, formatAxis(v))
      );
    });
    const bars = rows.map((r, i) => {
      const bar = svgEl("rect", { class: "hl-combo-bar", x: (cx(i) - barW / 2).toFixed(1), width: barW.toFixed(1), rx: 3 });
      svg.appendChild(bar);
      return { bar, top: y(r.value) };
    });
    const line = svgEl("polyline", { class: "hl-line", pathLength: 1, points: rows.map((_, i) => cx(i).toFixed(1) + "," + y(totals[i]).toFixed(1)).join(" ") });
    if (state.running) svg.appendChild(line);
    const dots = rows.map((_, i) => {
      const dot = svgEl("circle", { class: "hl-dot hl-combo-dot", cx: cx(i).toFixed(1), cy: y(totals[i]).toFixed(1), r: 3.5 });
      // Past three dozen periods the dots crowd into a bead string; the line is enough.
      if (state.running && rows.length <= 36) svg.appendChild(dot);
      return dot;
    });
    rows.forEach((r, i) => {
      if (i % every) return;
      svg.appendChild(svgEl("text", { x: cx(i).toFixed(1), y: base + 16, "text-anchor": "middle" }, r.label));
      // A second line names the group (the year) where it starts.
      if (r.group && (i === 0 || rows[i - 1].group !== r.group)) svg.appendChild(svgEl("text", { x: cx(i).toFixed(1), y: base + 30, "text-anchor": "middle" }, r.group));
    });

    // One transparent rect over the plot takes the pointer, so a bar's whole column is the target.
    const hit = svgEl("rect", { class: "hl-hit", x: pad.l, y: pad.t, width: innerW, height: innerH });
    svg.appendChild(hit);
    let hot = -1;
    const unhot = () => { if (hot >= 0) { bars[hot].bar.classList.remove("is-hot"); dots[hot].classList.remove("is-hot"); } };
    const clear = () => { unhot(); hot = -1; hideTip(); };
    hit.onpointerleave = clear;
    hit.onpointercancel = clear;
    hit.onpointermove = hit.onpointerdown = (event) => {
      const at = pointerAt(svg, event, width);
      if (!at) return;
      const index = Math.max(0, Math.min(rows.length - 1, Math.floor((at.x - pad.l) / band)));
      if (index === hot) { placeTip(event.clientX, event.clientY); return; }
      unhot();
      hot = index;
      bars[hot].bar.classList.add("is-hot");
      dots[hot].classList.add("is-hot");
      const r = rows[index];
      const content = [tipTitle(r.title || r.label, r.partial ? opts.words.so_far : ""), tipRow(opts.format(r.value), opts.words.each), tipRow(opts.format(totals[index]), opts.words.running)];
      // A period still running would mislead against a whole one, so it gets no change.
      if (!r.partial && index > 0 && rows[index - 1].value > 0) {
        const before = rows[index - 1].value;
        const change = ((r.value - before) / before) * 100;
        content.push(tipRow((change >= 0 ? "+" : "−") + Math.abs(change).toFixed(0) + "%", opts.words.on + " " + rows[index - 1].label));
      }
      showTip(content, event.clientX, event.clientY);
    };

    const grow = (t) => bars.forEach(({ bar, top }) => {
      const h = (base - top) * t;
      bar.setAttribute("y", (base - h).toFixed(1));
      bar.setAttribute("height", Math.max(0, h).toFixed(1));
    });
    state.cancel?.();
    if (animate) {
      if (state.running) line.classList.add("hl-draw-in");
      state.cancel = tween(360, grow);
    } else {
      grow(1);
    }
  }

  const watch = watchWidth(svg, render);

  return {
    // rows: [{ label, value, title?, group?, partial? }], oldest first.
    update(rows, { label = "" } = {}) {
      state.rows = rows || [];
      if (label) svg.setAttribute("aria-label", label);
      render(watch.width);
    },
    setRunning(on) {
      state.running = on;
      render(watch.width);
    },
    destroy() {
      state.cancel?.();
      watch.disconnect();
    },
  };
}
