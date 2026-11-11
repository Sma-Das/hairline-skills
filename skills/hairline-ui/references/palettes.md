# Color

Every color is a token in `assets/palettes.css`. `hairline.css` holds no hex values
except `#fff` on treemap tiles and `#000` in their mix. Pick a preset, or generate one.

## Roles

Dark is the default. Light is `data-theme="light"` on `.hl-root`. Each role has a job;
do not borrow one role's color for another's job.

- `bg`: the page. Dark presets use pure black (`--pure-black false` gives a lifted near-black).
- `surface`: only things that float (tooltip, menu, palette, toast). Never a section or card.
- `hover`: a row or item under the pointer, when a fill is wanted at all.
- `line`: the hairline between rows and sections.
- `line-strong`: table header rules, floating borders, field underlines, gridlines.
- `faint`: labels, notes, axis text, inactive options. Floor 4.5:1 on bg and surface.
- `muted`: secondary values, body text in notes, inactive nav. Floor 4.5:1, aim 6+.
- `ink`: headings, values, the chosen option. 12:1 or more.
- `rule`: the signature color. Nav and segmented thumb, chosen chip underline, quote
  bar, the search field's focused underline, bars in the default chart (`chart-bar`).
  One hue. It appears in thin strokes and in bars, nowhere as a large fill.
- `focus`: focus ring and text selection. A hue far from the rule, so a focused item
  never reads as a chosen one. Floor 3:1 on bg.
- `up` / `down`: the direction of a change, and alert or over-limit state (`up`).
  They are warm and cool, never pure red and green, and they always travel with an
  arrow and a sign. Do not assume up is bad: for spend it is, for revenue it is not.
  When up is good, swap the classes or the tokens for that figure, not the arrow.
- `chart-line`: the single series line and the sparkline. Near ink, so it reads first.
- `chart-bar`: the single-series bar fill. Defaults to the rule.
- `data-1..8`: categories (series, legend dots, treemap tiles). Even OKLCH lightness,
  hues spread around the wheel, every one 3:1 or more on bg. Assign them in order of
  size, and keep a category on the same color across every chart on the page.

## Presets

Each comes in dark and light. All pass the floors above (the generator prints the ratios).

- `bronze` (default, no attribute): warm graphite neutrals, muted bronze rule, blue
  focus. Quiet, premium, finance and usage desks. The original look.
- `graphite`: cool gray, steel-blue rule, cyan focus. Engineering, infra, developer tools.
- `moss`: green-gray, sage rule. Calm. Health, sustainability, outdoors, wellbeing.
- `oxblood`: warm gray, dusty rose rule. Editorial, legal, finance with a human tone.
- `amber`: neutral charcoal, gold rule. Ops consoles, trading, long night sessions.
- `iris`: violet-gray, lavender rule, teal focus. Creative tools and AI products.
- `mono`: no hue. White-label, or a product whose logo or photography carries the color.

How to choose:

1. The product already has a brand color: generate with `--rule` at that hue and a
   chroma of 0.04–0.08. A brand color at full chroma is too loud for a hairline UI;
   keep it for the logo.
2. No brand: pick by audience from the list above. When in doubt, `bronze` or `mono`.
3. The page is mostly charts with many categories: `mono` or `graphite`, so the data
   colors are the only color on the page.
4. Keep the neutral's hue near the rule's hue (within ~40°) with low chroma
   (0.004–0.012). A neutral with no relation to the rule looks unfinished.
5. Put the focus hue 120° or more from the rule.

## Generating

```bash
node scripts/palette.mjs --list                    # presets and their use
node scripts/palette.mjs --preset moss             # one preset's CSS
node scripts/palette.mjs --all > assets/palettes.css
node scripts/palette.mjs --name brand --neutral 250:0.008 --rule 255:0.07 --focus 160
node scripts/palette.mjs --name brand --neutral 30:0.01 --rule 30:0.06 --focus 250 --pure-black false
```

`--neutral H:C` and `--rule H:C` are OKLCH hue in degrees and chroma. `--focus H` is a
hue. The script fixes lightness per role, maps to sRGB inside the gamut, checks every
pair against its floor, prints the ratios as a comment, and exits 1 when one fails.
Paste the output into the app's palette file and set `data-palette="brand"`, or
replace the default block.

Hand edits: change one token, then run the contrast check again (the script's
`contrast(a, b)` export takes two hex colors). Never lower `faint` below 4.5:1 to make
the page "quieter"; lower the number of things on the page instead.

## Data colors

- One series: `chart-line` or `chart-bar`, never a data color.
- Two to eight: `data-1..n` in order. More than eight: show the top seven and group
  the rest as "Other" in `faint`.
- A category never depends on color alone: it also has a legend label, a table row, or
  a direct label.
- Sequential (heatmap, intensity): one hue, mixed from `bg` to `chart-bar` in four
  steps, `chart-line` at the top. Hollow squares for days with no data yet.
- Treemap tiles mix the data color with black at 34% (46% on hover) and carry white text.
