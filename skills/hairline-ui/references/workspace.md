# Analysis workspaces

Use this composition when one analytical question needs a large chart, an exact ranked readout, and persistent scope controls. Keep the ordinary dashboard layout for a page with several independent summaries.

Load the optional workspace stylesheet after the base styles. A workspace uses a viewport-height application wrapper on desktop, a 248px trailing rail, and a scrollable main region. Below 960px, let the document scroll and replace the rail with a full-screen native dialog. Below 700px, put the ranking under the chart. These are starting points; move the breakpoints when real content requires it.

The display heading is a separate role: 24px and weight 700. Keep ordinary section headings at 15px/500. Comparison figures use 38px/500 and -1px tracking, falling to 28px on phones. Three figures are appropriate for a paired comparison: left share, signed lead, and right share. Label the date and the meaning of the sign.

## Shared filters

`createFilterRail({ rail, dialog, trigger, content, closeButton })` moves one filter subtree between the desktop rail and a native modal dialog. Give the dialog an id and an accessible heading. Keep the close button in the dialog. The helper handles the trigger's expanded state, focus entry, native Escape dismissal, restoration, and resizing back to desktop. Call `destroy()` before removing the interface.

Use real checkboxes with stable labels for independent choices. Provide a selection count, Select all, Clear, and Reset. An empty selection is meaningful and should produce an empty view, not silently select everything. Explain any chart whose denominator or comparison cohort intentionally ignores those controls.

## Public view state

`parseViewState(search, { charts, days, groups })` validates URL choices against known options. `viewURL(href, state, options)` writes them without losing unrelated query parameters or a fragment. A missing group parameter means the default cohort; a present empty parameter means an explicit empty cohort. Bind Back and Forward through `popstate`.

Keep color mode, appearance, and personal preferences in browser storage. A shared link should carry the analytical question, not private preferences. When clipboard access is unavailable, reveal a labelled readonly field with the selected link instead of claiming it was copied.

## Provenance and saved output

`renderDataNotes(host, { source, updatedAt, coverage, estimated, methodology })` creates plain source and freshness text, a measured coverage statement, optional estimated intervals, and a native methodology disclosure. `source` is `{ label, url? }`; coverage is `{ reported, total, label? }`; estimated intervals are `{ from, to }`. Missing metadata stays explicitly unknown. Do not use the response time as the source's update time.

`exportChart(svg, { format, title, description, rows, notes, filename })` saves SVG or PNG. Each row is `{ label, value }`. Supply the current cohort, time window, inspection state, source, and coverage. The exporter resolves computed styles, sets dimensions, and embeds the bundled DM Sans font. PNG uses a blob image and canvas; a strict content policy must permit local blob images and data fonts. Report export failures visibly. Do not claim a file was saved merely because a button was pressed.

The bundled analysis scaffold demonstrates the complete flow with generated data. Its labels, cohorts, source metadata, and default colors are examples for adaptation.
