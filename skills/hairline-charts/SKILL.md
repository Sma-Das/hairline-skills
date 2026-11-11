---
name: hairline-charts
description: "Build clear SVG data visualizations and linked analytical readouts, including share charts, comparisons, trends, rankings, treemaps, and calendars."
---

# Hairline Charts

Turn a quantitative question into a chart people can read, inspect, and explain. Build purpose-specific SVG rather than accepting the visual defaults of a chart kit. Preserve the product's labels, units, colors, and framework; the chart should feel like part of the interface.

## Choose the comparison before the shape

Decide whether the person is comparing change over time, parts of a total, a position against a limit, two opposing outcomes, or many ranked items. That decision determines the representation.

Use a line for a trend, stacked bands for composition, and a normalized 100% stack when share matters more than volume. Pair a share chart with a ranking that gives exact values. Use a signed comparison around zero when the question is which of two groups leads; make both directions explicit. Use bars with a running total for accumulation, a treemap for many parts of one whole, a calendar for daily activity, and a scatter plot when two measures span a wide range. A short ranking often needs only labels and share bars.

## Keep the quantities honest

Use one understandable scale for comparable measures. Show a limit even when it raises the axis beyond the observations. Label logarithmic scales. Keep integer units on integer ticks, and distinguish projections from observations.

For share charts, normalize over the explicitly selected cohort. Name the denominator. State whether a period figure is a volume-weighted share or an average of daily shares; those answer different questions. A percentage-point change is the difference between two percentages, not a percentage growth rate.

Missing observations and all-zero totals are gaps. Do not turn them into 0% observations or connect a trend across them. Future days remain visibly different from recorded zeroes. A comparison against a completed period must account for a period still in progress.

## Connect the chart to its readout

Keep exact values available in labels, a ranking, or a keyboard-operable inspection state. Hover may help reading; it must never be the only way to obtain a value. Arrow keys should inspect dates, touch should be able to pin a selection, and Escape should return to the period view.

Link the chart and ranking in both directions. Inspecting a band emphasizes the matching row; focusing a row emphasizes its marks. Preserve stable row positions during date inspection so the target does not move under the pointer. Keep labels and focus attached to stable identities across updates. Distinguish a transient hover from a pinned selection.

Choose color for the relationship: distinct hues for unrelated categories, related tones for members of one family. Keep an item's color stable across filters and views. Use names and redundant cues alongside color, and verify contrast against both the page and any fill behind text.

## Make changes easy to follow

Repaint at the measured width and wait while hidden. Resizing and keyboard inspection should be immediate. Animate a meaningful data change from the values currently on screen, with interruption handled smoothly; do not replay an entrance whenever a chart repaints. Never overshoot a value. Preserve the treemap's spatial structure when weights change unless it becomes unreadable.

An export should contain the displayed theme, font, selected scope, exact readout, and relevant data notes. Resolve styles and dimensions so the saved SVG or PNG remains readable outside the application.

For data shapes and implementation details, consult the [chart guidance](references/anatomy.md); for share, comparison, and linked inspection behavior, use the [analysis guidance](references/analysis.md). Verify empty and partial data as carefully as the normal case, and inspect the working chart with pointer, keyboard, and touch-sized layouts.
