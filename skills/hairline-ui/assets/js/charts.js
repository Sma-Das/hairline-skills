// SVG chart primitives. No chart library: a chart is a function that takes data and a
// width and returns SVG built from the .hl-chart classes in hairline.css.
const NS = "http://www.w3.org/2000/svg";

export function svgEl(name, attrs, text) {
  const node = document.createElementNS(NS, name);
  if (attrs) Object.keys(attrs).forEach((key) => node.setAttribute(key, attrs[key]));
  if (text != null) node.textContent = text;
  return node;
}

// Axis steps are 1, 2, or 5 times a power of ten. `integer` keeps every tick whole,
// for values stored as integers (cents, counts).
export function niceTicks(max, count = 4, { integer = true } = {}) {
  const top = Math.max(max, integer ? 1 : Number.EPSILON);
  const raw = top / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  let step = [1, 2, 5, 10].map((m) => m * mag).find((n) => n >= raw);
  if (integer) step = Math.max(1, Math.ceil(step));
  const ticks = [];
  for (let v = 0; v <= top + step * 0.999 && ticks.length < 9; v += step) ticks.push(v);
  return ticks;
}

// Calls paint(width) now and whenever the width changes. A hidden chart measures 0 and
// waits, so a chart on a closed page or collapsed section paints when it opens.
export function watchWidth(node, paint) {
  let last = 0;
  const check = () => {
    const width = Math.round(node.getBoundingClientRect().width);
    if (width === 0) { last = 0; return; }
    if (width !== last) { last = width; paint(width); }
  };
  const observer = new ResizeObserver(check);
  observer.observe(node);
  return {
    // Never reuse an old positive width while the chart's page or section is closed.
    get width() { return node.closest("[hidden], .is-collapsed") ? 0 : last || Math.round(node.getBoundingClientRect().width); },
    disconnect() { observer.disconnect(); },
  };
}

// One line where a chart has nothing to draw, so an empty frame never reads as broken.
export function emptyText(width, height, text) {
  return svgEl("text", { class: "hl-chart-empty", x: (width / 2).toFixed(1), y: (height / 2).toFixed(1), "text-anchor": "middle" }, text);
}

// A small line with one series and no axes. It sits beside the number that names it.
export function sparkline(values, { width = 96, height = 28, color = "var(--hl-chart-line)", className = "" } = {}) {
  const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height, class: ("hl-spark " + className).trim(), "aria-hidden": "true" });
  const list = (values || []).map((v) => Number(v) || 0);
  if (list.length < 2) return svg;
  const max = Math.max(1, ...list);
  const pad = 2;
  const points = list.map((v, i) => {
    const x = pad + (i / (list.length - 1)) * (width - pad * 2);
    const y = pad + (1 - v / max) * (height - pad * 2);
    return x.toFixed(1) + "," + y.toFixed(1);
  });
  const line = svgEl("polyline", { points: points.join(" "), fill: "none", "stroke-width": "1.5", "stroke-linejoin": "round", "stroke-linecap": "round" });
  line.style.stroke = color;
  svg.appendChild(line);
  return svg;
}

// A bar chart over one series, as an example of the pattern: dotted grid, labels in
// faint text, bars in --hl-chart-bar, the hovered bar in ink and the rest dimmed.
// rows: [{ label, value }]. format(value) -> string.
export function barChart(rows, width, { height = 240, format = String, onHover = null } = {}) {
  const svg = svgEl("svg", { class: "hl-chart", viewBox: `0 0 ${width} ${height}`, role: "img" });
  svg.style.height = height + "px";
  if (!rows.length) { svg.appendChild(emptyText(width, height, "Nothing in this window.")); return svg; }
  const left = 44, right = 4, top = 8, bottom = 24;
  const ticks = niceTicks(Math.max(...rows.map((r) => r.value)));
  const top_ = ticks[ticks.length - 1] || 1;
  const y = (v) => top + (1 - v / top_) * (height - top - bottom);
  for (const t of ticks) {
    svg.appendChild(svgEl("line", { class: t ? "hl-gridline" : "hl-baseline", x1: left, x2: width - right, y1: y(t), y2: y(t) }));
    svg.appendChild(svgEl("text", { x: left - 8, y: y(t) + 4, "text-anchor": "end" }, format(t)));
  }
  const band = (width - left - right) / rows.length;
  const gap = Math.min(6, band * 0.25);
  const bars = svgEl("g");
  rows.forEach((row, i) => {
    const x = left + i * band + gap / 2;
    const rect = svgEl("rect", { class: "hl-bar", x: x.toFixed(1), y: y(row.value).toFixed(1), width: Math.max(1, band - gap).toFixed(1), height: Math.max(0, y(0) - y(row.value)).toFixed(1) });
    rect.addEventListener("pointerenter", (e) => { bars.classList.add("has-hot"); rect.classList.add("is-hot"); onHover?.(row, e); });
    rect.addEventListener("pointerleave", () => { bars.classList.remove("has-hot"); rect.classList.remove("is-hot"); onHover?.(null); });
    bars.appendChild(rect);
    const every = Math.ceil(rows.length / Math.max(1, Math.floor(width / 70)));
    if (i % every === 0) svg.appendChild(svgEl("text", { x: (x + (band - gap) / 2).toFixed(1), y: height - 6, "text-anchor": "middle" }, row.label));
  });
  svg.appendChild(bars);
  svg.setAttribute("aria-label", rows.map((r) => r.label + " " + format(r.value)).join(", "));
  return svg;
}
