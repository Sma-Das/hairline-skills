# Chart anatomy

The parts, numbers, data shapes, and options of each module. The numbers are the
ones the modules use. Change one only for a reason you can name.

## Shared (axes.js)

- `frameOf(width, height, pad)`: `innerW`, `innerH`, `base` (the y of the baseline).
- `drawYGrid(group, { width, height, pad, max, count = 3, format, integer })`: draws
  dotted gridlines (`1 4`) and a solid baseline, and returns the axis top. Ticks come
  from `niceTicks` (1, 2, or 5 times a power of ten), and the top tick is the axis top.
- `drawXLabels(group, { labels, xAt, y, innerW, spacing = 96 })`: about one label per
  96px. It always draws the first and the last, with each end anchored inward.
- `pointerAt(svg, event)`: the pointer in viewBox units.
- `prefixSums(values)`: running totals.
- Axis text is faint, 11.5px, and tabular. It goes 6px above the bottom edge.
- `watchWidth` (charts.js) paints at the measured width. A width of 0 waits.

## Line (createLineChart)

- Height 260. Padding `{ l: 52, r: 18, t: 18, b: 26 }`.
- `update({ points: [{ label, value }], ahead: [label], limit, projected, label })`:
  - `ahead` holds the labels still to come, so the x axis spans the whole period.
  - `limit` is a dashed rule with a label. The label moves below the rule when the
    rule is within 18px of the top.
  - `projected` is a dashed segment from the last point to the right edge.
  - `label` is the SVG's accessible name.
- `setMode("running" | "daily")`: the same scale and place. Running shows the line
  and the end dot. Daily shows bars, each up to 40px wide (`band - 2`).
- End label: 10px from the end dot and 8px above it. It flips to the left side when
  it would run past the right edge.
- Hover: a crosshair rule from the top to the baseline, a dot on the running line,
  and the hot bar (the others dim). The tooltip shows that day's value and the
  running total.
- Options: `height`, `mode`, `format`, `formatAxis`, and `words`
  (`each`, `running`, `limit`, `empty`).

## Stacked (createStackedChart)

- Height 280. Padding `{ l: 52, r: 14, t: 12, b: 26 }`.
- `update(labels, series, { label })`. Each series is
  `{ key, label, color, values, other?, members? }`. `other` marks the fold, and
  `members` lists the names inside it.
- Bands are paths with a 1px stroke in the page color, which is the gap between
  neighbors.
- `setMode("daily" | "running")`.
- Legend: each entry is a button. A click solos that series and a second click
  clears the solo. While one series is soloed (`.is-solo`), the others dim to .45.
  A hidden series keeps its layer at zero height, so it grows back from where it was.
- Hover: a crosshair and the tooltip. The tooltip lists the total, then each series
  largest first.
- `onPick(series)` makes the bands clickable (`.is-clickable`). The "Other" band is
  never clickable. Its legend title lists its members instead.
- Words: `total`, `running`, `only`, `empty`.

## Combo (createComboChart)

- Height 280. Padding `{ l: 56, r: 12, t: 14, b: 38 }`. The bottom is taller because
  it holds the group label (the year) under the period labels.
- `update(rows, { label })`. Each row is `{ label, group, title, value, partial? }`.
- `setRunning(bool)`: shows or hides the running-total line and its dots.
- Bars are `band * 0.62` wide, clamped from 4px to 56px, with `rx: 3`. Each bar is 85%
  `chart-bar` mixed into the page color, and the hot bar is full `chart-bar`.
- A period gets a label when it has 36px of room (`every = ceil(36 / band)`). The
  tooltip names every period.
- Dots are drawn only up to 36 periods.
- A `partial` period says "so far" and shows no change against the period before it.
  A whole period shows its change as a percentage "on" the previous one.
- One `.hl-hit` rect covers the plot, so the pointer only has to be in a column.
- Words: `each`, `running`, `so_far`, `on`, `empty`.

## Scatter (createScatter)

- Height 340. Padding `{ l: 58, r: 20, t: 16, b: 40 }`.
- Both axes are log10. Their ends are the floor and the ceiling of the data's decades.
  Each title says "log scale".
- `update(points, { label })`. Each point is `{ key, name, x, y, size, color }`.
- Radius is `4 + sqrt(size / maxSize) * 26`, so area tracks size. The fill opacity is
  .75 and the stroke is solid, so overlaps stay readable.
- Labels: up to 6 (`labels`), biggest first. A label is drawn only where it does not
  hit another label or the edge.
- Hover: the nearest bubble whose edge is within `reach` (28px) of the pointer.
- `onPick(point, event)` makes bubbles clickable.
- Options: `xTitle`, `yTitle`, `formatX`, `formatY`, `formatSize`, `labels`, `reach`,
  `onPick`, and `words` (`x`, `y`, `size`, `empty`).

## Treemap (createTreemap)

- The host is 460px tall, and 340px below a 560px container width.
- `update(items)`. Each item is `{ key, name, value, color }`. `back()` closes the tail
  view. `reset()` forgets the layout when the keys change completely.
- `fold: { minShare: 0.006, maxTiles: 24 }`: the long tail becomes one tile,
  "N smaller". Clicking it opens those items as their own map, and `onLevel` tells the
  page to show a back control. Escape goes back.
- `onPick(item, tile, event)` turns tiles into buttons.
- Words: `empty`, `smaller(n)`, `ofTotal`, `open`.
- See `treemap.md` for the layout and the motion.

## Calendar heatmap (paintHeatmap)

- `paintHeatmap(host, days, { format, name, breakdown, words })`.
  Each day is `{ day: "YYYY-MM-DD", value, future? }`, in any order.
- One column per week, with Sunday on top. Mon, Wed, and Fri are labeled.
- A month gets a label at its first week, only when it has two columns of room.
- Levels: `ceil(value / max * 4)`, clamped to 1..4. Zero is level 0 (the surface
  color). Levels 1 to 3 mix `chart-bar` into the page color at 22%, 45%, and 72%.
  Level 4 is `chart-line`.
- Future days are hollow 1px outlines. Pad cells (outside the range) are blank. The
  latest stored day gets a 1px `muted` ring.
- Columns are at least 10px. The grid scrolls sideways and opens at its newest end.
- `breakdown(day)` returns `[{ label, value, color }]` rows for the tooltip.
- The accessible name gives the range and the busiest day, so that day can be found
  without a pointer.

## Tween timing

- An update with the same number of marks eases from the shown values: 280ms
  `EASE_OUT`.
- A new length (another window, or a first paint) rises from the baseline: 360ms.
- Combo bars always grow from the baseline: 360ms.
- Hover dims and fills: 100ms. A mode toggle's opacity swap: 160ms.
- Reduced motion, the keyboard, and resizes all draw the final frame at once.
