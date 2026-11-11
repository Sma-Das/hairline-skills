---
name: hairline-charts
description: "Build hand-drawn SVG charts for dashboards: line, stacked, bars + running total, scatter, treemap, calendar heatmap."
---

# Hairline charts

Data charts drawn by hand in SVG and plain DOM, with no chart library. Built for
usage and spend dashboards, admin desks, and internal tools, where a few chart types
done carefully beat a library's fifty. Each chart is one ES module that takes a
host element and returns `update()` plus a few setters.

The look comes from `hairline-ui` (tokens, `.hl-chart` classes, tooltip, motion
helpers). This skill adds the chart modules, their CSS, and the rules behind them.
For motion in general, see `hairline-motion`.

## Files

- `assets/js/line.js`: `createLineChart`. One series over time, running total (line)
  or per step (bars), with an optional limit line and projection.
- `assets/js/stacked.js`: `createStackedChart`. Several series stacked over time, with
  a legend that isolates one series.
- `assets/js/combo.js`: `createComboChart`. Bars per period plus a running-total line.
- `assets/js/scatter.js`: `createScatter`. Log-log bubbles, labeled where a label fits.
- `assets/js/treemap.js` + `layout.js`: `createTreemap` over a stable split-tree
  layout, so the walls slide when values change. `layout.js` is pure:
  `node --test assets/js/layout.test.mjs`.
- `assets/js/heatmap.js`: `paintHeatmap`. A calendar of days in four steps.
- `assets/js/axes.js`: shared padding, y grid, x labels, and pointer helpers.
- `assets/charts.css`: chart classes beyond `hairline.css`. Load after it.
- `assets/specimen.html`: every chart on generated data. It needs `hairline-ui` beside
  this skill and an HTTP server (ES modules do not load from `file://`):
  `python3 -m http.server 8123` from the skills folder, then
  `/hairline-charts/assets/specimen.html?palette=moss&theme=light`.
- `assets/specimen-dark.png`, `specimen-light.png`: what it should look like.
- `references/anatomy.md`: each chart's parts, numbers, data shape, and options.
  Read it before you build or change a chart.
- `references/treemap.md`: the stable layout, the glide, and tile fitting.

Install: copy `hairline-ui/assets/js/{charts,motion,tooltip}.js` and this skill's
`assets/js/*.js` into one folder (the modules import `./charts.js`, `./motion.js`,
and `./tooltip.js`), then load `palettes.css`, `hairline.css`, and `charts.css`.

## Choose the chart

- A value over time against a limit or a target: **line**, running mode. Per-step
  detail: the same chart in daily mode, so the toggle keeps the scale and the place.
- Parts of a total over time: **stacked**. Five to eight series at most; fold the rest
  into "Other", which lists its members in its title and tooltip.
- Totals per period (months, quarters) and the total so far: **combo**.
- Two measures that each span orders of magnitude (volume and price): **scatter** on
  log axes. A third measure becomes bubble area.
- Shares of one total with many items: **treemap**. Not a pie, and not a donut.
- Activity per day across a year: **calendar heatmap**.
- One figure with its trend beside it: `sparkline` from `hairline-ui`.
- A ranked list: a table with an in-cell bar (`hl-cell-bar` in `hairline-ui`), not a
  bar chart.

## Rules

- **One y scale.** A limit, a projection, and a running line share the bars' scale.
  There is never a second axis. A limit above the data raises the axis, so it is
  always on the chart.
- **Axes.** Ticks are 1, 2, or 5 times a power of ten (`niceTicks`), three or four of
  them, and the top tick is the axis top. Integer data gets integer ticks. Gridlines
  are dotted (`1 4`), the baseline is solid, and axis text is faint 11.5px tabular.
  X labels go about one per 96px, always the first and the last, with the ends
  anchored inward. A log axis says "log scale" in its title.
- **Color.** One series is chart-line or chart-bar ink. Categories use `--hl-data-1..8`,
  and a category keeps its color on every chart on the page. Identity never rests
  on color alone: the legend, the tooltip, labels, and the accessible name all
  carry the name.
- **Hover enhances and never gates.** Every value in a tooltip is also in a table,
  a label, or the accessible name. Hover dims the other marks to 30%
  (`.has-hot` / `.is-hot`). Line charts get a crosshair and a dot. The pointer only
  has to be near: a column for bars, the nearest index for lines, within 28px of the
  edge for bubbles. `pointerdown` shows the same tooltip for touch.
- **Paint on width.** `watchWidth` paints at the measured width and repaints when it
  changes. A hidden chart measures 0 and waits, so a chart in a closed section paints
  when it opens. The viewBox is the measured width, so text never scales.
- **Empty is said.** A chart with nothing to draw says so in one faint line inside
  its frame. An empty frame reads as broken.
- **Future is hollow.** Days not stored yet are outlines, not zero-value squares.
  A period still running says "so far" and gets no change against a whole one.
- **Motion.** Marks are keyed and ease from what is on screen to the new values
  (280ms). A new window length rises from the baseline (360ms). The first paint may
  grow once; later repaints never replay it. Reduced motion jumps to the end.
  Keyboard actions and resizes are instant. Theme changes snap.
- **Accessibility.** The SVG has `role="img"` and an `aria-label` that states the
  range and the headline. A treemap tile is a button whose label has its name,
  figure, and share. Tab order follows value. Focus survives a repaint.
- **Text is text.** Series names go in through `textContent`, never `innerHTML`.

## Building a new chart

Follow the shape of the existing modules: create the SVG groups once, then
`render(width, animate)` rebuilds the grid and sets attributes on keyed marks, and a
`frame(values, max, width)` function draws one moment so a tween can call it. Keep
`state.shown` (what is on screen) apart from the target, so a new update eases from
where the marks are. Return `update`, the setters, and `destroy`.

Check every change in the specimen, dark and light, at 1280px and 390px wide.
Hover each chart, toggle each mode, and shuffle the treemap mid-move.
