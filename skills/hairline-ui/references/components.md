# Components

Every class is in `assets/hairline.css`; every one appears in `assets/specimen.html`.
Markup below is the minimum. Copy from the specimen for the full shape.

## Frame

```html
<body class="hl-root" data-palette="graphite">        <!-- data-theme="light" for light -->
  <a class="hl-skip" href="#main">Skip to content</a>
  <header class="hl-header"><div class="hl-header-inner">
    <a class="hl-brand" href="/">Product</a>
    <nav class="hl-nav" aria-label="Pages"><a href="#" aria-current="page">Overview</a>…</nav>
    <div class="hl-header-actions">…</div>
  </div></header>
  <div class="hl-ctx"><div class="hl-ctx-inner">
    <div class="hl-ctx-group"><!-- window, scope, filters --></div>
    <div class="hl-ctx-group"><!-- export, layout --></div>
  </div></div>
  <main class="hl-page" id="main">
    <div class="hl-page-head"><h1>Title</h1><p class="hl-intro">…</p><p class="hl-scope">Oct 12 – Nov 10 · 30 days</p></div>
    <div class="hl-board">…sections…</div>
  </main>
</body>
```

- Header: sticky, 60px, full-width bar, contents in the 1536px column. Nav is text with
  a 2px rule thumb under the current page (`syncThumb(nav)`).
- Context bar: the one sticky row under the header. It holds what scopes the whole page
  (time window, team, filter) and nothing else. It goes static under 800px.
- Set `--hl-ctx-h` on `.hl-root` to the context bar height if anchors must clear it.

## Sections

```html
<section class="hl-section" data-width="half">
  <div class="hl-section-head">
    <div class="hl-section-title"><h2>Budget</h2><p class="hl-note">One line on what this shows.</p></div>
    <div class="hl-section-actions">…chips, seg…</div>
    <button class="hl-collapse" aria-expanded="true" aria-label="Collapse Budget">chevron</button>
  </div>
  <div class="hl-section-body"><div class="hl-section-inner">…</div></div>
</section>
```

- A section is a hairline on top and air. No box, fill, or radius.
- `data-width="half"` pairs two sections side by side above 1000px.
- Collapse toggles `.is-collapsed`; the chevron shows on hover only with a fine pointer.
- Layout (order, hidden, collapsed, width) is a per-browser preference in localStorage.

## Controls

- `hl-button`: a word in `muted`, `ink` on hover. `hl-button-primary`: the one solid
  thing, ink fill, bg text. At most one per form, none in sections.
- `hl-seg` + `hl-seg-opt[aria-pressed]`: mutually exclusive text options. `createSeg`
  or `syncThumb(host)` adds the thumb.
- `hl-chip[aria-pressed]`: a toggle among section options; the chosen one underlines in rule.
- `hl-input`, `hl-select`, `textarea.hl-input`: a hairline to write on. Wrap in
  `label.hl-label`. Errors: `aria-invalid="true"` and `.hl-field-error` text under it.
- `enhanceSelect(select, { variant: "bar" })` (`select.js`): the custom drop-down. The
  native select stays as the source of truth; call `.csel.refresh()` after setting its
  value from code. `bar` is the quiet version for the context bar; add `.is-active` to
  the select when it filters something.
- `hl-switch`: `<span class="hl-switch"><input type="checkbox"><i></i></span>`. For a
  setting that applies at once.
- `hl-check`: a check list row with a count; the dot and ink both carry the state.

## Figures

- `hl-kpis` > `hl-kpi`: label, `hl-kpi-row` (value 26px + optional `hl-spark`),
  `hl-kpi-note` with a `delta()`. `.is-alert` puts value and note in `up`.
- `hl-stats` > stat label, value 20px, note. For secondary figures.
- `hl-hero-value`: 40px, one per page at most.
- In an analysis workspace, `hl-display-title` is a distinct bold display role. `hl-comparison` can contain three large figures for left share, the signed lead, and right share; this is one comparison, not three unrelated heroes.
- `hl-delta[data-dir]`: arrow + sign + number. Color adds to them, never replaces them.
- `hl-meter`: 3px track, fill with `--value: 0..1`, optional `hl-meter-mark` at
  `--mark: 55%` for even pace. `data-status="over"` uses `up`. Always followed by an
  `hl-status` sentence that says the same thing in words.
- `hl-insights`: two or three plain sentences about what changed. Computed, not canned.

## Tables

- `hl-table` in `hl-table-wrap` (scrolls sideways). Strong rule under the header, faint
  rules between rows, no zebra, no fills. Numbers right-aligned in `hl-numeric`.
- Sort: `th[aria-sort]` with `button.hl-sort`; the arrow shows on the sorted column.
- `hl-subtext` under a name for the email or id. `td.has-bar` + `hl-cell-bar` for share.
- `data-prio="low"` hides a column under 800px.
- `hl-table-tools`: a search field (rule underline on focus) and `hl-count` "4 of 142".
- `tr.is-clickable` opens the record in a drawer or a hash route.

## Charts

SVG built by hand, from `charts.js`: `svgEl`, `niceTicks`, `watchWidth`, `emptyText`,
`sparkline`, `barChart`.

- `hl-chart` 260px tall, full width. Axis text faint 11.5px. Gridlines dotted
  (`1 4`), baseline solid. One series: `hl-line` (1.5px, chart-line) or `hl-bar`
  (chart-bar). Projection: dotted line. A limit: dashed muted line with a label.
- Hover: `.has-hot` on the group, `.is-hot` on the mark; others dim. A crosshair
  (`hl-crosshair`) for line charts. The tooltip (`tooltip.js`: `bindTip`, `tipTitle`,
  `tipRow`) enhances and never gates: every value is also in a table or label.
- `watchWidth` repaints on width change and waits while hidden; never paint a chart
  that measures 0.
- Empty data: one line of text in the frame (`emptyText`), never an empty axis.
- `hl-legend` > `button.hl-legend-item[aria-pressed]` with `style="--c: var(--hl-data-2)"`.
- Treemap: absolutely placed `button.hl-tile` with `--c`. A stable split layout, so a
  filter slides walls instead of reshuffling tiles. Clicking a tile drills in.
- Heatmap: `hl-heat` of `<i data-level="0..4">`, `data-future` for days not stored.
- The sparkline hides when its KPI is narrower than 250px.

## Floating

Only floating things get `surface` and a `line-strong` border. No radius, no shadow.

- `hl-tip`: one tooltip for the whole page, positioned with transform, flips at edges.
- `hl-toast` via `createToast()`: bottom end, 3.6s, a live region carries the words.
- `hl-palette` via `createPalette({ items })`: Cmd/Ctrl+K and `/`. Items come from data
  the viewer already has. Grouped, fuzzy (`matchScore`), arrows + Enter.
- `hl-dialog`: native `<dialog>`, page background, sticky head. `hl-drawer` slides from
  the end edge. Backdrop click and Escape close; focus returns to the opener.
- `hl-panel`: a side panel on wide screens, a bottom sheet under 1200px.
- `hl-csel-list`: the drop-down list, flips up or to the end when it would clip.

## States

- Loading first time: `.hl-wait:empty` pulses in the box the content will fill.
- Refetching: keep the last figures, `.is-refreshing` dims after 450ms.
- Empty: `hl-empty` with a sentence that says why and what to do ("No requests in
  this window. Try 90 days.").
- Error: a sentence in the section, plus a retry button. Never a raw status code alone.
- Disabled: 45% opacity and `cursor: default`; say why near it when it is not obvious.
- No permission: hide the control, do not show it disabled.
