# Share, balance, and linked inspection

Both analytical charts accept a list of date labels and series whose values align with those labels. A series is `{ key, label, color, values }`; use a stable key and a number or `null` for each observation. Negative values are invalid for these compositions. Use a signed trend chart for intrinsically negative measurements.

## Calculations

`shareData(series, length)` returns normalized series, raw observations, daily totals, and the number of complete observed days. If any selected series is missing or invalid on a day, that day is a gap across the stack. An all-zero total is also a gap. A recorded zero within a positive total remains an honest 0% observation.

`rankShares(data, index?)` gives either volume-weighted period shares or one day's shares. Period change is last observed share minus first observed share, in percentage points. It is unknown with fewer than two observed days. Ranking ties use stable keys. The on-screen ranking retains its period order during date inspection, so it never moves underneath the pointer.

`balanceData(left, right)` computes `100 × (left − right) / (left + right)`, from -100 to +100. Zero is an even split. A +20pp lead means 60% versus 40%; it does not mean 20% growth. Missing and all-zero pairs are gaps. `observedRuns(values)` supplies separate runs so lines never bridge missing data.

## Create the interface

Use `createShareChart(svg, rankingHost, options)` for a normalized stack, or `createBalanceChart` for a fixed two-series comparison. Both return `update(labels, series, { label, preserveInspection? })`, `inspect(index, { pin, announce })`, `rows()`, and `destroy()`.

Options include `height`, a raw-value `format` function, a visible `readout` node, an initially empty polite `live` region, and an `onInspect({ index, pinned, rows, data })` callback. Use that callback to update comparison figures or other linked information. Read `rows()` for the current export readout. Call `destroy()` before replacing a chart; it removes listeners and disconnects the resize observer.

The SVG is a date-inspection slider. Left/Right and Home/End move across dates, Enter or Space toggles a pin, and Escape returns to the period view. A pointer tap pins the date. Ranking buttons support focus, series emphasis, and pinned selection; Escape clears it. Hover does not cause screen-reader announcements, but explicit keyboard and pinned inspection can update the polite region.

Use the workspace ranking styles from the UI skill. As with the other charts, place the UI's chart primitives alongside the chart modules so their relative imports resolve. The analysis scaffold performs this integration automatically.

## Denominators and context

Normalize after applying the intended cohort filter. A fixed comparison may intentionally use a different cohort; label that exception near both the filter and the chart. Do not let a selection silently change the meaning of a historical comparison.

Show the period, UTC dates where appropriate, source freshness, coverage, and estimated intervals. Keep the chart's accessible name and its exported description aligned with that scope. Verify a single observed day, no series, all-zero totals, a missing middle day, a changed cohort, and interrupted rapid inspection.
