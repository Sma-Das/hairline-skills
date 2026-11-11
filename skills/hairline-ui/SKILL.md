---
name: hairline-ui
description: "Build or restyle web UIs in the flat hairline style: dark-first dashboards, desks, and admin tools."
---

# Hairline UI

A flat, type-led interface style for data-heavy web apps: dashboards, usage desks,
admin consoles, internal tools. Type sits on the page, 1px hairlines separate things,
controls are words with an underline. Color comes from one quiet signature hue and a
categorical data palette. Dark first, with a matching light theme.

Keep the user's product, words, framework, and data. This skill sets the look and the
interaction rules, not the content. For the matching build stack (Svelte 5 + Vite +
Go embed), see the `hairline-stack` skill.

## Files

- `assets/palettes.css`: every color token, seven presets, dark and light. Load first.
- `assets/hairline.css`: every component, token-only. Load second.
- `assets/dm-sans.woff2` + `FONT-LICENSE.txt` (OFL): the font. Ship the license with it.
- `assets/js/`: plain ES modules, no dependencies. `ui.js` (el, icon, prefs, seg and
  thumb, delta, focus trap, toast, slowFlag), `motion.js`, `select.js` (custom
  drop-down over a native select), `tooltip.js`, `palette.js` (command palette),
  `charts.js` (SVG primitives, sparkline, bar chart).
- `assets/specimen.html`: every component on one page. Serve it over HTTP (the page uses ES modules); `?palette=moss&theme=light`.
- `assets/specimen-dark.png`, `specimen-light.png`: what the specimen should look like.
- `scripts/palette.mjs`: generate a palette from hues and check contrast.
- `references/palettes.md`: color roles, presets, how to choose, data colors. Read
  before picking colors.
- `references/components.md`: markup and rules per component. Read before building.
- `references/motion.md`: curves, durations, and when not to animate.

Start: copy `assets/` into the app's static folder, add `class="hl-root"` to `<body>`
(or the app root), pick `data-palette`, then build from the specimen's markup.

## Character

- Flat. No cards, panels, radii, gradients, or shadows on the page. A section is a
  hairline above it and air below it.
- Only things that float over the page (tooltip, menu, palette, toast, drawer) get the
  surface color and a hairline border. Still no radius and no shadow.
- Controls are text. Buttons are words that go from muted to ink. Options are text
  with a 1px rule-colored thumb under the chosen one. Fields are an underline.
- The one solid thing on a page is a form's primary action: ink fill, bg text.
- Hierarchy comes from size, weight 500 vs 400, and ink vs muted vs faint. Not color,
  not boxes.
- Restraint over decoration. If something needs a box to be seen, the page has too much.

## Color

Use the tokens. Never write a hex value in component CSS. Roles: `bg`, `surface`,
`hover`, `line`, `line-strong`, `faint`, `muted`, `ink`, `rule` (signature), `focus`,
`up`, `down`, `chart-line`, `chart-bar`, `data-1..8`.

Recommend a preset from `references/palettes.md` that fits the product, and say why in
one line. Presets: `bronze` (default, warm, premium), `graphite` (engineering),
`moss` (calm, health), `oxblood` (editorial, legal), `amber` (ops, night),
`iris` (creative, AI), `mono` (white-label). With a brand color, generate one:
`node scripts/palette.mjs --name brand --neutral H:0.008 --rule H:0.06 --focus H2`.
Keep the rule low-chroma; full brand saturation belongs to the logo.

- `rule` appears as thin strokes and chart bars only. Never a large fill.
- `focus` is far from the rule in hue, so focus never reads as selection.
- `up`/`down` always ride with an arrow and a sign. Up is not automatically bad.
- One series uses `chart-line`/`chart-bar`; categories use `data-1..8` in order, same
  category same color on every chart.
- Floors: ink 12:1, muted and faint 4.5:1 on bg and surface, rule/focus/up/down 3:1.
  The generator checks them; rerun after any hand edit.

## Typography

- DM Sans, variable 400–700, with system fallbacks. Weights 400 and 500 only.
- Base 15px / 1.6. Page title 26px 500 −0.6px. Section title 15px 500. Notes 12.5px
  faint. Table 13.5px, header 12px faint 400. KPI 26px 500 −0.6px. Stat 20px. Hero 40px
  −1.2px, one per page.
- `font-variant-numeric: tabular-nums` on every number, table, chart, and delta.
- `text-wrap: balance` on headings, `pretty` on notes and intros.
- Sentence case everywhere. No all-caps labels, no letter-spaced eyebrows.

## Layout

- One 1536px column, 28px gutters (16px under 800px).
- Sticky 60px header, then one sticky context bar for the page's scope (window, team,
  filter). Under 800px the context bar stops sticking and nav wraps to its own row.
- Page head: h1, one intro line, one scope line ("Oct 12 – Nov 10 · 30 days").
- `hl-board`: a two-column grid of sections, each full width or half (`data-width`).
  One column under 1000px.
- Figures first (KPIs), then trend, then breakdown, then the table, then actions.
- Breakpoints: 1199 (side panel becomes sheet), 1000 (one column), 800 (gutters,
  nav, low-priority columns), 560 (two-up KPIs, 40–44px touch targets, 16px inputs).

## Interaction

- Every state is in the DOM: `aria-pressed`, `aria-current`, `aria-expanded`,
  `aria-sort`, `aria-selected`. Motion and color only add to it.
- Hover styles only under `(hover: hover) and (pointer: fine)`.
- Focus: 2px `focus` outline, 3px offset, on `:focus-visible`.
- Keyboard: Cmd/Ctrl+K and `/` open the palette, Escape closes the top layer, arrows
  move in lists. A keyboard action takes effect without animation.
- URL state: the page and the record live in the hash (`#people/<id>`), so Back works
  and restores focus and scroll.
- Per-browser preferences (theme, palette, window, section layout, chart mode) live
  in localStorage (`readPref`/`writePref`) and never go to the server.
- Theme change snaps. See `references/motion.md` for everything that moves.

## Data viz

- SVG drawn by hand from `charts.js`. No chart library.
- Dotted gridlines, faint axis text, a solid baseline, 1.5px lines, bars with a small gap.
- Hover dims other marks; the tooltip enhances and never gates. Every value it shows
  is also in a table or label on the page.
- Repaint on width change; never paint while hidden.
- Empty data is one sentence in the frame. A projection is dotted, a limit dashed.
- Integer units (cents, counts) get integer ticks.
- Prefer a table plus a share bar over a pie. Treemap for parts of a whole with many
  parts; heatmap for a year of days.

## States

Loading pulses in the box the content will fill. Refetch keeps the last figures and
dims after 450ms. Empty says why and what to try. Errors are a sentence plus Retry.
Things the viewer cannot use are hidden, not disabled.

## Copy

- Plain, short, specific. "68% of $900 used, 55% of the month gone."
- Numbers carry their unit and their comparison: "+12% vs $4,296.10".
- Buttons say what happens: "Send request", not "Submit".
- Notes say what the section shows in one line. No marketing voice, no exclamation marks.

## Anti-patterns

- Cards with shadows or radii around sections. Filled pill toggles. Gradient headers.
- Colored backgrounds for state (red row, green badge). Use `up`/`down` text and arrows.
- Icon-only controls without a label. Icons are 24-grid, 1.8 stroke, round caps, and
  usually sit beside a word.
- A chart library's default look, legends with squares, 3D, pies with many slices.
- A brand color at full chroma on lines and bars.
- Spinners. Skeletons shaped like fake content. Animation on every repaint.
- More than one primary button in view.

## Checklist

- [ ] `palettes.css` before `hairline.css`; `.hl-root` set; a preset chosen with a reason.
- [ ] No hex in component CSS; no radius or shadow on the page.
- [ ] Contrast checked (`node scripts/palette.mjs --preset <name>` or the custom args).
- [ ] Every number tabular; every delta has arrow and sign.
- [ ] Every chart value also in a table or label; empty and hidden states handled.
- [ ] States in ARIA; focus visible; hover gated to fine pointers; reduced motion works.
- [ ] Checked at 1440, 1000, 800, and 320px, dark and light.
