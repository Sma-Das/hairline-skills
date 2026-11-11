---
name: hairline-ui
description: "Design and build flat, typography-led dashboards and analytical interfaces with expressive color, clear hierarchy, and precise interactions."
---

# Hairline UI

Design a working interface whose clarity comes from typography, alignment, and space. Give the product a deliberate visual identity without covering the data in containers or decoration. Preserve the user's content, framework, and brand; this skill supplies a design approach, not a fixed theme.

## Start with the decision

Identify what the person needs to understand or do, what information supports that decision, and which controls change its scope. Arrange the page around that sequence. A monitoring overview, a detailed investigation, and a form should not inherit the same layout merely because they share a stylesheet.

Choose a dashboard when people scan several independent summaries. Choose an analysis workspace when one chart, a ranked breakdown, and persistent filters must work together. On a wide screen, a narrow filter rail can remain visible beside the analysis. On a phone, move those filters into an explicitly labelled dialog, put the ranking below the chart, and let the document scroll naturally.

## Let typography establish the hierarchy

Use DM Sans when the brief calls for this character, or preserve an established product typeface. Build clear roles rather than giving every heading the same weight. A bold 24px display heading, a 38px medium-weight comparison figure, and quieter 12–14px supporting text are useful starting points. Smaller section headings can stay at medium weight. Give large numerals slightly tighter tracking and use tabular figures wherever values are compared.

Keep labels in sentence case. Express hierarchy through scale, weight, and spacing before adding another color or border. Compact desktop controls should remain readable, and touch targets should grow on smaller screens without shrinking the text.

## Choose color for the subject

Keep page chrome neutral and reserve vivid color for information, selection, and emphasis. Recommend a palette for the product and explain the choice briefly. Copper, sky blue, emerald, coral, gold, and violet are possibilities, not a mandatory sequence; black and bronze are not the identity of every project.

Use categorical colors when unrelated items need distinct identities. Use related tones within a family when the relationship itself matters: several products from one group can share a hue while another group uses a contrasting hue or a neutral family. Assign colors from stable identities so filtering and sorting never repaint an item. Give unknown groups an explicit neutral treatment.

Color must survive both appearances and the actual surfaces it touches. Check text, chart marks, focus rings, and hover fills separately. Retain labels and other non-color cues. Consult the [color guidance](references/palettes.md) when generating or adapting a palette.

## Make the interface feel direct

Use text controls, underlines, and restrained hairlines to explain grouping and selection. Keep ordinary content on the page; reserve raised surfaces for things that float. Resist repeated metric cards, ornamental badges, and decorative gradients when alignment and whitespace already do the work.

Make scope visible near the data. Filters need a selection count and a clear way back. If one view intentionally ignores a filter, say so beside that view. A chart and its ranking should share an inspection state: pointer hover, keyboard focus, and a pinned touch selection must reveal the same information without moving the ranking under the pointer.

Explain source, freshness, missing coverage, and estimates where they affect interpretation. Put detailed methodology behind a meaningful disclosure. Write errors and empty states as specific explanations with a useful next action.

Build complete keyboard paths, visible focus, labelled controls, and reliable focus restoration for dialogs. Keep the last good data during a refresh. Apply appearance changes immediately and avoid animation on frequent reading actions. For the workbench composition and controls, use the [workspace guidance](references/workspace.md) and [interaction recipes](references/components.md) when needed.

## Build, inspect, refine

Implement the actual interactions, then inspect the result in dark and light appearances and at narrow widths. Check long names, empty selections, missing days, and a fully open filter panel. Remove anything that competes with the primary question. Keep the user's chosen aesthetic ahead of the defaults in this skill.
