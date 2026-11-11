// Shared chart scaffolding: padding, the y grid, evenly spaced x labels, and pointer
// position in SVG units. Builds on hairline-ui's charts.js.
import { niceTicks, svgEl } from "./charts.js";

// Plot geometry for a chart of `width` x `height` with padding `pad`.
export function frameOf(width, height, pad) {
  const innerW = Math.max(40, width - pad.l - pad.r);
  const innerH = height - pad.t - pad.b;
  return { innerW, innerH, left: pad.l, right: width - pad.r, top: pad.t, base: pad.t + innerH };
}

// Draws dotted gridlines and right-aligned labels into `group`. Returns the axis top,
// the highest tick, so the data never touches the frame.
export function drawYGrid(group, { width, height, pad, max, count = 3, format = String, integer = true }) {
  const ticks = niceTicks(max, count, { integer });
  const top = ticks[ticks.length - 1] || 1;
  const f = frameOf(width, height, pad);
  const y = (v) => f.base - (v / top) * f.innerH;
  group.replaceChildren();
  ticks.forEach((v) => {
    const at = y(v).toFixed(1);
    group.append(
      svgEl("line", { class: v === 0 ? "hl-baseline" : "hl-gridline", x1: pad.l, x2: width - pad.r, y1: at, y2: at }),
      svgEl("text", { x: pad.l - 8, y: (y(v) + 4).toFixed(1), "text-anchor": "end" }, format(v))
    );
  });
  return top;
}

// Up to one label per `spacing` px, always the first and the last. The ends anchor
// inward, so they never hang off the plot.
export function drawXLabels(group, { labels, xAt, y, innerW, spacing = 96 }) {
  group.replaceChildren();
  const n = labels.length;
  if (!n) return;
  const count = Math.min(n, Math.max(2, Math.floor(innerW / spacing)));
  for (let k = 0; k < count; k++) {
    const i = count === 1 ? 0 : Math.round((k * (n - 1)) / (count - 1));
    const anchor = count === 1 ? "middle" : k === 0 ? "start" : k === count - 1 ? "end" : "middle";
    group.appendChild(svgEl("text", { x: xAt(i).toFixed(1), y, "text-anchor": anchor }, labels[i]));
  }
}

// Pointer position in viewBox units. The SVG is drawn at its measured width, so the
// scale is 1 until the box changes between paints.
export function pointerAt(svg, event, width) {
  const box = svg.getBoundingClientRect();
  if (!box.width) return null;
  const scale = width / box.width;
  return { x: (event.clientX - box.left) * scale, y: (event.clientY - box.top) * scale };
}

export function show(node, on) {
  node.style.display = on ? "" : "none";
}

export function prefixSums(values) {
  let run = 0;
  return values.map((v) => (run += Number(v) || 0));
}
