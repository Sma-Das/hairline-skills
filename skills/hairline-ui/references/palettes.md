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
- `chart-line`: the single-series line and sparkline. The saturated signature hue;
  `mono` uses near-ink instead.
- `chart-bar`: the single-series bar fill. Defaults to the rule.
- `data-1..8`: categories (series, legend dots, treemap tiles). Even OKLCH lightness,
  hues spread around the wheel, every one 3:1 or more on bg. Assign them in order of
  size, and keep a category on the same color across every chart on the page.

## Presets

Each comes in dark and light. All pass the floors above (the generator prints the ratios).

- `bronze` (default, no attribute): warm graphite neutrals, bright copper-orange
  accent, blue focus. Finance and usage desks.
- `graphite`: cool gray, vivid sky-blue accent, orange focus. Engineering, infra, developer tools.
- `moss`: green-gray, saturated leaf-green accent. Health, sustainability, outdoors, wellbeing.
- `oxblood`: warm gray, vivid red-coral accent. Editorial, legal, finance with a human tone.
- `amber`: neutral charcoal, bright gold accent. Ops consoles, trading, long night sessions.
- `iris`: violet-gray, saturated violet accent, emerald focus. Creative tools and AI products.
- `mono`: neutral chrome with the same bright categorical colors. White-label, or a
  product whose logo or photography carries the accent.

How to choose:

1. The product already has a brand color: generate with `--rule` at that hue and a
   chroma of 0.16–0.24. Preserve the hue and let the generator reduce chroma only
   where sRGB requires it. Bright chart marks work against neutral page chrome.
2. No brand: pick by audience from the list above. For a general data tool, start with `graphite`; use `mono` for neutral chrome.
3. The page is mostly charts with many categories: `mono` or `graphite`, so the data
   colors remain distinct from the page chrome.
4. Keep the neutral's hue near the rule's hue (within ~40°) with low chroma
   (0.004–0.012). A neutral with no relation to the rule looks unfinished.
5. Put the focus hue 120° or more from the rule.

## Generating

```bash
node scripts/palette.mjs --list                    # presets and their use
node scripts/palette.mjs --preset moss             # one preset's CSS
node scripts/palette.mjs --all > assets/palettes.css
node scripts/palette.mjs --name brand --neutral 250:0.008 --rule 250:0.20 --focus 35
node scripts/palette.mjs --name brand --neutral 30:0.01 --rule 30:0.20 --focus 250 --pure-black false
```

`--neutral H:C` and `--rule H:C` are OKLCH hue in degrees and chroma. `--focus H` is a
hue. The script fixes lightness per role, maps to sRGB inside the gamut, checks foregrounds, categorical marks, and treemap hover labels
against their contrast floors, prints the ratios as a comment, and exits 1 when one fails.
Paste the output into the app's palette file and set `data-palette="brand"`, or
replace the default block.

Hand edits: change one token, then run the contrast check again (the script's
`contrast(a, b)` export takes two hex colors). Never lower `faint` below 4.5:1 to make
the page "quieter"; lower the number of things on the page instead.

## Data colors

### Related families

For related entities, use `familyColor(key, family, { theme, tone?, tones? })` from the bundled family helper. Built-in families are coral, silver, emerald, sky, violet, and neutral. The stable key chooses a tone without depending on the current sort or filter; provide an integer tone when a specific sibling distinction matters. Unknown families use neutral. Custom tones provide dark and light family arrays, including a neutral fallback.

Use the returned hue for marks, swatches, and large comparison figures. Keep small labels in normal ink unless their actual color/background pair clears the text threshold. Related tones can be deliberately subtle; the legend and names still carry identity. Keep the bright categorical mode available when distinct unrelated categories need it.

- One series: `chart-line` or `chart-bar`, never a data color.
- Two to eight: `data-1..n` in order. More than eight: show the top seven and group
  the rest as "Other" in `faint`.
- A category never depends on color alone: it also has a legend label, a table row, or
  a direct label.
- Sequential (heatmap, intensity): one hue, mixed from `bg` to `chart-bar` in four
  steps, `chart-line` at the top. Hollow squares for days with no data yet.
- Treemap tiles retain 55% of the data color (65% on hover) over black. This keeps
  the fills vivid while white labels retain at least 4.5:1 contrast in both themes.
- Data colors use higher chroma than the neutral chrome. Avoid an all-pastel
  categorical palette; keep orange, violet, blue, emerald, amber, pink, cyan, and
  leaf green visibly distinct.
