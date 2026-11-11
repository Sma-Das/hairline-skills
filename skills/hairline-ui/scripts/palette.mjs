#!/usr/bin/env node
// Builds hairline-ui color tokens from a few OKLCH choices and checks WCAG contrast.
//
//   node palette.mjs --list                      preset names
//   node palette.mjs --preset moss               one preset as CSS
//   node palette.mjs --all > palettes.css        every preset as CSS
//   node palette.mjs --neutral 230:0.012 --rule 230:0.08 --focus 200 --name harbor
//
// --neutral HUE:CHROMA   tint of the gray ramp (chroma 0 to 0.02; 0 is pure gray)
// --rule HUE:CHROMA      the signature color: underlines, active marks, chart bars (0.03 to 0.12)
// --focus HUE            focus ring and text selection; pick a hue far from the rule
// --up HUE --down HUE    direction colors for deltas (defaults: warm 45, teal-green 160)
// --pure-black false     use a near-black page instead of #000 in dark mode
//
// Exits 1 and prints the failing pairs when a pair misses its contrast floor.

const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function oklchToLinear(L, C, H) {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h), b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

// Lowers chroma until the color fits sRGB, so hue and lightness survive.
export function hex(L, C, H) {
  let c = C;
  let rgb = oklchToLinear(L, c, H);
  while (c > 0 && !rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4)) {
    c = Math.max(0, c - 0.002);
    rgb = oklchToLinear(L, c, H);
  }
  return "#" + rgb.map((v) => Math.round(toGam(Math.min(1, Math.max(0, v))) * 255).toString(16).padStart(2, "0")).join("");
}

function luminance(color) {
  const [r, g, b] = [1, 3, 5].map((i) => toLin(parseInt(color.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Lightness and a share of the neutral chroma for each gray role.
const ramps = {
  dark: { bg: [0, 0], surface: [0.155, 0.6], hover: [0.19, 0.6], line: [0.25, 0.7], "line-strong": [0.32, 0.8], faint: [0.62, 0.9], muted: [0.74, 1], ink: [1, 0] },
  light: { bg: [0.985, 0.35], surface: [1, 0], hover: [0.955, 0.6], line: [0.915, 0.7], "line-strong": [0.84, 0.8], faint: [0.53, 1], muted: [0.47, 1.1], ink: [0.25, 1] },
};

// [dark L, light L] for accent roles. Chroma is the caller's.
const accentL = { rule: [0.75, 0.47], focus: [0.64, 0.5], up: [0.75, 0.52], down: [0.73, 0.5] };

export const presets = {
  bronze: { label: "Bronze. Warm graphite with a muted bronze rule. The original look.", neutral: [55, 0.012], rule: [70, 0.045], focus: 262, up: 45, down: 155 },
  graphite: { label: "Graphite & Sky. Cool gray, steel-blue rule, cyan focus. Engineering and infra tools.", neutral: [250, 0.012], rule: [240, 0.075], focus: 222, up: 50, down: 175 },
  moss: { label: "Moss. Green-gray with a sage rule. Calm, outdoorsy, sustainability, health.", neutral: [145, 0.01], rule: [135, 0.07], focus: 258, up: 60, down: 205 },
  oxblood: { label: "Oxblood. Warm gray with a dusty rose rule. Editorial, finance, legal.", neutral: [20, 0.01], rule: [17, 0.09], focus: 258, up: 68, down: 165 },
  amber: { label: "Amber. Neutral charcoal with a gold rule. Ops consoles, trading, night use.", neutral: [75, 0.008], rule: [78, 0.11], focus: 255, up: 33, down: 160 },
  iris: { label: "Iris. Violet-gray with a lavender rule and teal focus. Creative and AI products.", neutral: [285, 0.014], rule: [290, 0.1], focus: 205, up: 48, down: 165 },
  mono: { label: "Mono. Pure gray, no hue at all. Brand-neutral, white-label, or a strong logo.", neutral: [0, 0], rule: [0, 0], focus: 260, up: 48, down: 160 },
};

const floors = [
  ["ink", "bg", 7], ["muted", "bg", 4.5], ["faint", "bg", 4.5], ["faint", "surface", 4.5], ["muted", "surface", 4.5],
  ["rule", "bg", 3], ["focus", "bg", 3], ["up", "bg", 4.5], ["down", "bg", 4.5],
];

export function build({ neutral, rule, focus, up = 45, down = 160, pureBlack = true }) {
  const out = {};
  for (const [mode, i] of [["dark", 0], ["light", 1]]) {
    const t = {};
    for (const [role, [L, share]] of Object.entries(ramps[mode])) {
      const l = role === "bg" && mode === "dark" && !pureBlack ? 0.13 : L;
      t[role] = hex(l, neutral[1] * share, neutral[0]);
    }
    if (mode === "dark" && !pureBlack) {
      t.surface = hex(0.19, neutral[1] * 0.6, neutral[0]);
      t.hover = hex(0.22, neutral[1] * 0.6, neutral[0]);
      t.line = hex(0.28, neutral[1] * 0.7, neutral[0]);
      t["line-strong"] = hex(0.35, neutral[1] * 0.8, neutral[0]);
    }
    t.rule = hex(accentL.rule[i], rule[1] * (i ? 1.15 : 1), rule[0]);
    t.focus = hex(accentL.focus[i], i ? 0.19 : 0.16, focus);
    t.up = hex(accentL.up[i], i ? 0.15 : 0.12, up);
    t.down = hex(accentL.down[i], i ? 0.11 : 0.1, down);
    // Chart ink: the running line and the bar fill. The bar reuses the rule.
    t["chart-line"] = mode === "dark" ? hex(0.92, neutral[1] * 0.6, neutral[0]) : t.ink;
    t["chart-bar"] = t.rule;
    out[mode] = t;
  }
  return out;
}

// One categorical set per mode: even lightness, spaced hues, so no series shouts.
export function dataPalette() {
  const hues = [40, 290, 230, 150, 75, 340, 195, 110];
  return { dark: hues.map((h) => hex(0.74, 0.11, h)), light: hues.map((h) => hex(0.54, 0.12, h)) };
}

export function check(tokens) {
  const fails = [];
  for (const mode of ["dark", "light"]) {
    const t = tokens[mode];
    for (const [a, b, min] of floors) {
      const v = contrast(t[a], t[b]);
      if (v < min) fails.push(`${mode} ${a} on ${b}: ${v.toFixed(2)} < ${min}`);
    }
  }
  return fails;
}

export function css(name, tokens) {
  const block = (sel, t) => `${sel} {\n${Object.entries(t).map(([k, v]) => `  --hl-${k}: ${v};`).join("\n")}\n}`;
  const dark = name === "bronze" ? ".hl-root" : `.hl-root[data-palette="${name}"]`;
  const light = name === "bronze" ? '.hl-root[data-theme="light"]' : `.hl-root[data-palette="${name}"][data-theme="light"]`;
  return `${block(dark, tokens.dark)}\n${block(light, tokens.light)}`;
}

function report(tokens) {
  const lines = [];
  for (const mode of ["dark", "light"]) {
    const t = tokens[mode];
    lines.push(`/* ${mode}: ` + floors.map(([a, b]) => `${a}/${b} ${contrast(t[a], t[b]).toFixed(1)}`).join(", ") + " */");
  }
  return lines.join("\n");
}

function parsePair(raw, name) {
  const [h, c] = String(raw).split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(c)) throw new Error(`--${name} wants HUE:CHROMA, like 230:0.012`);
  return [h, c];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf("--" + k); return i < 0 ? undefined : args[i + 1]; };
  let failed = false;
  const emit = (name, spec) => {
    const tokens = build(spec);
    const fails = check(tokens);
    if (fails.length) { failed = true; console.error(`${name}:\n  ` + fails.join("\n  ")); }
    console.log(`/* ${spec.label || name} */\n${css(name, tokens)}\n${report(tokens)}\n`);
  };
  if (args.includes("--list")) {
    for (const [k, p] of Object.entries(presets)) console.log(`${k.padEnd(9)} ${p.label}`);
  } else if (args.includes("--all")) {
    console.log("/* Generated by scripts/palette.mjs --all. Bronze is the default and needs no attribute. */\n");
    for (const [k, p] of Object.entries(presets)) emit(k, p);
    const data = dataPalette();
    console.log(`/* Categorical data colors. Every one clears 3:1 on its page. */\n.hl-root {\n${data.dark.map((c, i) => `  --hl-data-${i + 1}: ${c};`).join("\n")}\n}\n.hl-root[data-theme="light"] {\n${data.light.map((c, i) => `  --hl-data-${i + 1}: ${c};`).join("\n")}\n}`);
  } else if (opt("preset")) {
    const p = presets[opt("preset")];
    if (!p) { console.error("unknown preset; try --list"); process.exit(2); }
    emit(opt("preset"), p);
  } else if (opt("neutral") && opt("rule")) {
    emit(opt("name") || "custom", {
      neutral: parsePair(opt("neutral"), "neutral"),
      rule: parsePair(opt("rule"), "rule"),
      focus: Number(opt("focus") ?? 260),
      up: Number(opt("up") ?? 45),
      down: Number(opt("down") ?? 160),
      pureBlack: opt("pure-black") !== "false",
    });
  } else {
    console.error("usage: palette.mjs --list | --all | --preset NAME | --neutral H:C --rule H:C [--focus H] [--name N]");
    process.exit(2);
  }
  process.exit(failed ? 1 : 0);
}
