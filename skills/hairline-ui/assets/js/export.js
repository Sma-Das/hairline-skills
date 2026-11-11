// Export first-party SVG charts with resolved styles, the bundled font, the current
// readout, and data notes. No foreignObject or external images are required.
const NS = "http://www.w3.org/2000/svg";
const properties = ["fill", "fill-opacity", "fill-rule", "stroke", "stroke-width", "stroke-opacity", "stroke-dasharray", "stroke-dashoffset", "stroke-linecap", "stroke-linejoin", "opacity", "font-family", "font-size", "font-weight", "font-variant-numeric", "letter-spacing", "text-anchor", "dominant-baseline", "display", "visibility", "clip-path"];
let fontData;
const text = (parent, value, attributes) => {
  const node = document.createElementNS(NS, "text"); node.textContent = value;
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  parent.append(node);
};
async function embeddedFont() {
  if (!fontData) fontData = fetch(new URL("../dm-sans.woff2", import.meta.url)).then((response) => {
    if (!response.ok) throw new Error("Could not load the export font.");
    return response.blob();
  }).then((blob) => new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob);
  })).catch((error) => { fontData = null; throw error; });
  return fontData;
}

export async function chartSVG(svg, { title = "Analysis", description = "", rows = [], notes = [] } = {}) {
  await document.fonts.ready;
  const box = svg.getBoundingClientRect();
  if (!box.width || !box.height) throw new Error("Show the chart before exporting it.");
  const viewBox = svg.viewBox.baseVal;
  const width = Math.max(320, Math.round(box.width));
  const chartHeight = viewBox.width ? Math.round(width * viewBox.height / viewBox.width) : Math.round(box.height);
  const wrappedNotes = notes.flatMap((note) => String(note).match(/.{1,95}(?:\s|$)|.{1,95}/g) || []).map((line) => line.trim());
  const height = 88 + chartHeight + rows.length * 24 + wrappedNotes.length * 19 + 24;
  const root = document.createElementNS(NS, "svg");
  root.setAttribute("xmlns", NS); root.setAttribute("width", width); root.setAttribute("height", height); root.setAttribute("viewBox", `0 0 ${width} ${height}`);
  root.setAttribute("role", "img"); root.setAttribute("aria-label", title + ". " + description);
  const css = getComputedStyle(svg.closest(".hl-root") || document.body);
  const background = css.getPropertyValue("--hl-bg").trim() || "#ffffff";
  const ink = css.getPropertyValue("--hl-ink").trim() || "#20201e";
  const muted = css.getPropertyValue("--hl-muted").trim() || "#625d57";
  const style = document.createElementNS(NS, "style");
  style.textContent = `@font-face{font-family:"DM Sans";font-weight:400 700;src:url("${await embeddedFont()}")}text{font-family:"DM Sans",sans-serif}`;
  root.append(style);
  const bg = document.createElementNS(NS, "rect");
  for (const [key, value] of Object.entries({ width, height, fill: background })) bg.setAttribute(key, value);
  root.append(bg);
  text(root, title, { x: 16, y: 30, fill: ink, "font-size": 22, "font-weight": 700 });
  text(root, description, { x: 16, y: 54, fill: muted, "font-size": 12 });
  const clone = svg.cloneNode(true);
  const sources = [svg, ...svg.querySelectorAll("*")];
  const targets = [clone, ...clone.querySelectorAll("*")];
  sources.forEach((source, index) => {
    const computed = getComputedStyle(source);
    for (const property of properties) {
      const value = computed.getPropertyValue(property).replace(/url\(["']?[^)"']*#([^)'"\s]+)["']?\)/g, "url(#$1)");
      targets[index].style.setProperty(property, value);
    }
    for (const attribute of [...targets[index].attributes]) if (/^on/i.test(attribute.name)) targets[index].removeAttribute(attribute.name);
  });
  clone.querySelectorAll("script,foreignObject,image,a").forEach((node) => node.remove());
  clone.querySelectorAll("[href]").forEach((node) => { if (!node.getAttribute("href").startsWith("#")) node.removeAttribute("href"); });
  clone.removeAttribute("tabindex"); clone.style.width = width + "px"; clone.style.height = chartHeight + "px";
  for (const [key, value] of Object.entries({ x: 0, y: 72, width, height: chartHeight })) clone.setAttribute(key, value);
  root.append(clone);
  let y = 92 + chartHeight;
  for (const row of rows) {
    text(root, row.label, { x: 16, y, fill: ink, "font-size": 13 });
    text(root, row.value, { x: width - 16, y, fill: ink, "font-size": 13, "text-anchor": "end", "font-variant-numeric": "tabular-nums" });
    y += 24;
  }
  for (const note of wrappedNotes) { text(root, note, { x: 16, y, fill: muted, "font-size": 11.5 }); y += 19; }
  return new Blob([new XMLSerializer().serializeToString(root)], { type: "image/svg+xml;charset=utf-8" });
}

export async function exportChart(svg, { format = "svg", filename = "analysis", ...options } = {}) {
  if (!["svg", "png"].includes(format)) throw new TypeError("Export format must be svg or png.");
  let blob = await chartSVG(svg, options);
  if (format === "png") {
    const url = URL.createObjectURL(blob);
    try {
      const image = new Image(); image.src = url; await image.decode();
      const canvas = document.createElement("canvas"); canvas.width = image.width * 2; canvas.height = image.height * 2;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("PNG export is unavailable in this browser.");
      context.scale(2, 2); context.drawImage(image, 0, 0);
      blob = await new Promise((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("PNG export failed.")), "image/png"));
    } finally { URL.revokeObjectURL(url); }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = filename.replace(/[^a-z0-9_-]/gi, "-").slice(0,80) + "." + format;
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  return blob;
}
