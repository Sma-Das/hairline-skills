// Items by two measures that span orders of magnitude, on log axes, with bubble area
// as a third. The pointer only has to be near a bubble, not on it. The biggest bubbles
// are labeled where a label fits; the tooltip and a table on the page name the rest.
import { emptyText, svgEl, watchWidth } from "./charts.js";
import { lerp, reduced, tween } from "./motion.js";
import { hideTip, placeTip, showTip, tipRow, tipTitle } from "./tooltip.js";
import { pointerAt } from "./axes.js";

const compact = (v) => Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v);

export function createScatter(svg, options = {}) {
  const opts = {
    height: 340,
    labels: 6,
    reach: 28,
    xTitle: "",
    yTitle: "",
    formatX: compact,
    formatY: compact,
    formatSize: compact,
    words: { x: "x", y: "y", size: "size", empty: "Nothing to plot." },
    onPick: null,
    ...options,
  };
  const pad = { l: 58, r: 20, t: 16, b: 40 };
  const state = { points: [], width: 0, cancel: null, drawn: new Map() };
  svg.classList.add("hl-chart");
  svg.setAttribute("role", "img");
  svg.style.height = opts.height + "px";
  const grid = svgEl("g");
  const dots = svgEl("g", { class: "hl-dots" });
  const labels = svgEl("g", { class: "hl-scatter-labels" });
  svg.replaceChildren(grid, dots, labels);

  // Whole decades on both axes, at least one decade wide.
  function scales(width, points) {
    const lo = (v) => Math.floor(Math.log10(Math.min(...v)));
    const hi = (v) => Math.ceil(Math.log10(Math.max(...v)));
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const x0 = lo(xs), x1 = Math.max(x0 + 1, hi(xs));
    const y0 = lo(ys), y1 = Math.max(y0 + 1, hi(ys));
    const innerW = Math.max(40, width - pad.l - pad.r);
    const innerH = opts.height - pad.t - pad.b;
    return {
      x0, x1, y0, y1,
      x: (v) => pad.l + ((Math.log10(v) - x0) / (x1 - x0)) * innerW,
      y: (v) => pad.t + innerH - ((Math.log10(v) - y0) / (y1 - y0)) * innerH,
    };
  }

  function placeLabels(width, target) {
    const bottom = opts.height - pad.b;
    const placed = [];
    const hitsBubble = (box, own) => [...target.entries()].some(([key, c]) => {
      if (key === own) return false;
      const nx = Math.max(box.x, Math.min(c.cx, box.x + box.w));
      const ny = Math.max(box.y, Math.min(c.cy, box.y + box.h));
      return Math.hypot(c.cx - nx, c.cy - ny) < c.r;
    });
    // Above, below, right, left: the first side clear of the frame, labels, and other bubbles.
    // With no clear side the label is left off rather than overlap.
    state.points.slice().sort((a, b) => b.size - a.size).slice(0, opts.labels).forEach((p) => {
      const t = target.get(p.key);
      const w = p.name.length * 6.6 + 6;
      const sides = [
        { x: t.cx - w / 2, y: t.cy - t.r - 6 },
        { x: t.cx - w / 2, y: t.cy + t.r + 14 },
        { x: t.cx + t.r + 6, y: t.cy + 4 },
        { x: t.cx - t.r - 6 - w, y: t.cy + 4 },
      ];
      const spot = sides.find((side) => {
        const box = { x: side.x, y: side.y - 11, w, h: 14 };
        const inside = box.x >= pad.l && box.x + box.w <= width - pad.r && box.y >= pad.t + 2 && box.y + box.h <= bottom - 2;
        const clear = !placed.some((b) => box.x < b.x + b.w && box.x + box.w > b.x && box.y < b.y + b.h && box.y + box.h > b.y);
        return inside && clear && !hitsBubble(box, p.key);
      });
      if (!spot) return;
      placed.push({ x: spot.x, y: spot.y - 11, w, h: 14 });
      labels.appendChild(svgEl("text", { class: "hl-scatter-label", x: spot.x.toFixed(1), y: spot.y.toFixed(1) }, p.name));
    });
  }

  function render(width, animate) {
    if (!width) return;
    state.width = width;
    svg.setAttribute("viewBox", `0 0 ${width} ${opts.height}`);
    const points = state.points;
    grid.replaceChildren();
    labels.replaceChildren();
    if (!points.length) {
      dots.replaceChildren();
      grid.appendChild(emptyText(width, opts.height, opts.words.empty));
      state.drawn = new Map();
      return;
    }
    const s = scales(width, points);
    const bottom = opts.height - pad.b;
    for (let p = s.x0; p <= s.x1; p++) {
      const x = s.x(10 ** p).toFixed(1);
      grid.append(svgEl("line", { class: "hl-gridline", x1: x, x2: x, y1: pad.t, y2: bottom }), svgEl("text", { x, y: bottom + 16, "text-anchor": "middle" }, opts.formatX(10 ** p)));
    }
    for (let p = s.y0; p <= s.y1; p++) {
      const y = s.y(10 ** p);
      grid.append(svgEl("line", { class: "hl-gridline", x1: pad.l, x2: width - pad.r, y1: y.toFixed(1), y2: y.toFixed(1) }), svgEl("text", { x: pad.l - 8, y: (y + 4).toFixed(1), "text-anchor": "end" }, opts.formatY(10 ** p)));
    }
    // Say the scale is logarithmic in the axis title. A reader assumes linear.
    if (opts.xTitle) grid.appendChild(svgEl("text", { class: "hl-axis-title", x: width - pad.r, y: bottom + 32, "text-anchor": "end" }, opts.xTitle));
    if (opts.yTitle) grid.appendChild(svgEl("text", { class: "hl-axis-title", x: pad.l, y: pad.t - 4 }, opts.yTitle));

    // Area, not radius, carries the size: r grows with the square root.
    const maxSize = Math.max(...points.map((p) => p.size));
    const target = new Map(points.map((p) => [p.key, { cx: s.x(p.x), cy: s.y(p.y), r: 4 + Math.sqrt(p.size / maxSize) * 26 }]));
    const keep = new Set(target.keys());
    [...dots.children].forEach((node) => { if (!keep.has(node.dataset.key)) node.remove(); });
    points.forEach((p) => {
      let dot = dots.querySelector(`[data-key="${CSS.escape(p.key)}"]`);
      if (!dot) {
        dot = svgEl("circle", { class: "hl-scatter-dot" });
        dot.dataset.key = p.key;
        dots.appendChild(dot);
      }
      dot.style.fill = dot.style.stroke = p.color;
    });
    placeLabels(width, target);

    const draw = (current) => current.forEach((c, key) => {
      const dot = dots.querySelector(`[data-key="${CSS.escape(key)}"]`);
      if (!dot) return;
      dot.setAttribute("cx", c.cx.toFixed(1));
      dot.setAttribute("cy", c.cy.toFixed(1));
      dot.setAttribute("r", c.r.toFixed(1));
    });
    state.cancel?.();
    if (animate && !reduced()) {
      const from = new Map(state.drawn);
      state.cancel = tween(280, (t) => {
        const now = new Map();
        // A bubble that is new grows from nothing at its own place.
        target.forEach((end, key) => {
          const a = from.get(key) || { ...end, r: 0 };
          now.set(key, { cx: lerp(a.cx, end.cx, t), cy: lerp(a.cy, end.cy, t), r: lerp(a.r, end.r, t) });
        });
        draw(now);
        state.drawn = now;
      });
    } else {
      draw(target);
      state.drawn = target;
    }
  }

  const watch = watchWidth(svg, (width) => render(width, !state.width));

  let hot = null;
  const clear = () => {
    hot?.classList.remove("is-hot");
    hot = null;
    dots.classList.remove("has-hot");
    svg.style.cursor = "";
    hideTip();
  };
  // The nearest edge within `reach` px wins, so small bubbles are as easy to hit as big ones.
  function nearest(event) {
    const at = pointerAt(svg, event, state.width);
    if (!at) return null;
    let best = null;
    let gap = opts.reach;
    state.drawn.forEach((c, key) => {
      const d = Math.hypot(c.cx - at.x, c.cy - at.y) - c.r;
      if (d < gap) { best = key; gap = d; }
    });
    return best ? state.points.find((p) => p.key === best) : null;
  }
  const onMove = (event) => {
    const point = nearest(event);
    if (!point) { clear(); return; }
    const dot = dots.querySelector(`[data-key="${CSS.escape(point.key)}"]`);
    if (dot === hot) { placeTip(event.clientX, event.clientY); return; }
    hot?.classList.remove("is-hot");
    hot = dot;
    hot?.classList.add("is-hot");
    dots.classList.add("has-hot");
    svg.style.cursor = opts.onPick ? "pointer" : "";
    showTip([
      tipTitle(point.name),
      tipRow(opts.formatSize(point.size), opts.words.size),
      tipRow(opts.formatX(point.x), opts.words.x),
      tipRow(opts.formatY(point.y), opts.words.y),
    ], event.clientX, event.clientY);
  };
  svg.addEventListener("pointermove", onMove);
  svg.addEventListener("pointerdown", onMove);
  svg.addEventListener("pointerleave", clear);
  svg.addEventListener("click", (event) => {
    const point = nearest(event);
    if (point && opts.onPick) opts.onPick(point, event);
  });

  return {
    // points: [{ key, name, x, y, size, color }]. Non-positive values cannot sit on a log axis and are dropped.
    update(points, { label = "" } = {}) {
      state.points = (points || []).filter((p) => p.x > 0 && p.y > 0 && p.size > 0);
      if (label) svg.setAttribute("aria-label", label);
      render(watch.width, true);
    },
    destroy() {
      state.cancel?.();
      watch.disconnect();
    },
  };
}
