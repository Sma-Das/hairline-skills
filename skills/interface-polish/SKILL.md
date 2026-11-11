---
name: interface-polish
description: "Audit and improve an existing web app's UI and UX while preserving its design language. Use for polish passes, inconsistent typography or icons, cramped panes, weak contrast, awkward controls, snapping menus, and requests to make a shipped interface feel more considered. Covers visual hierarchy, control geometry, pane-aware layout, interaction states, and motion. Prefer a design-direction skill for a new visual identity and a performance skill for load-speed work."
---

# Interface polish

Make the interface easier to read, aim at, and move through. Begin with the product that exists: its typeface, icons, colors, density, components, and framework. Improve the relationships between those choices. Change a visual convention only when an observed problem or the user's brief justifies it.

## Find the friction in use

Trace a representative task through the actual screen. Open a menu, select a row, narrow a pane, apply a filter, and return to the content. Read the component and token definitions behind the visible problems. Screenshots reveal hierarchy and spacing; interaction reveals clipped focus, unreachable controls, and motion that snaps.

Prioritize failures that block reading or action before cosmetic inconsistencies. Tie each proposed change to a concrete symptom: metadata that disappears, a trailing action pushed out of view, a number that jitters, or a menu whose scale jumps while its opacity fades. For a broad request, choose a coherent pass and implement it. For a review-only request, give findings with locations and evidence.

Inspect the repository's instructions, supported toolchain, and existing checks before editing. Read the current cascade and any overlapping changes. A token substitution that looks identical on one branch can change geometry after another branch updates that token.

## Give text and icons distinct jobs

Establish a small set of text roles. Let the row title lead, the metadata explain, and the action remain recognizable. A dense desktop interface might use 14px/600 titles, 12px/400 metadata, and 16px section labels. Treat these as starting points; a reading-heavy or touch-first app may need larger text. Keep the established font if it can express the required weights.

Use spacing and weight to separate roles before adding more boxes or colors. Keep related metadata below its title with an intentional gap. Use tabular figures for updating counts, and reserve enough width for the largest expected value. Balance short headings or use better paragraph wrapping where supported, without relying on wrapping rules to fix an undersized pane.

Measure secondary text against its actual background in every supported theme. Ordinary text needs at least 4.5:1 contrast. Opacity compounds with surface colors, so a plausible token value alone proves little. Preserve the product's palette and semantic color roles; no particular font, accent hue, icon library, or neutral-only theme is required.

Keep icon sizes and optical weight consistent within a role. Inspect the existing set before changing stroke width, because libraries use different geometry. A small glyph can sit in a larger button. Give icon-only controls accessible names and hide decorative duplicates from assistive technology.

## Make geometry support the action

Use the existing radius scale consistently. If the scale itself needs work, map sizes to roles such as small chips, controls, and floating panels rather than replacing every corner with one radius. For nested shapes, derive the inner radius from the outer radius minus the actual inset, including border and padding. Clamp it at zero when needed.

Size the interactive target separately from the visible icon or text. Aim for at least 24 by 24 CSS pixels on compact controls and more generous touch targets where space permits. WCAG has spacing and other exceptions; verify those explicitly before relying on them. Prefer button padding or a wrapping label. Invisible hit-area extensions need checks for clipping, overlap, and accidental activation of neighboring controls.

Use borders and shadows for grouping, state, or elevation when they help. Another shadow plane is rarely the first fix for weak hierarchy. Preserve visible focus inside clipped lists, using an inset treatment when appropriate. Keep essential actions discoverable without hover, including on touch devices.

## Respond to the space the component has

A wide window can contain a narrow work area after a sidebar or inspector opens. Size reusable headers, rows, and composers from their available pane width. Put container queries on the relevant ancestor and adapt its descendants; a size query cannot resize its own query container. Check overlay positioning and stacking after introducing containment.

Decide what yields first. Let labels shrink with `min-width: 0`, reserve a stable track for the trailing action, then demote secondary chrome before compressing the primary task. A hidden label still needs an accessible name. Removing a decorative disclosure is different from removing the only way to activate a row.

Test long titles, large counts, real metadata, empty lists, and filtered-out results. Explain why a view is empty and offer an appropriate recovery, such as clearing a filter or creating an item. Keep existing content during background refresh when it remains valid. Do not replace loaded rows with a skeleton just because a request started.

Read the [implementation traps](references/implementation-traps.md) when changing pane responsiveness, nested controls, or overlays.

## Make motion match the state change

Use the animation system and easing tokens already present. Inspect computed styles before claiming that a class or token replacement changes the motion. Explicitly transition the properties that actually change: individual CSS `scale` and `translate` are separate from `transform`.

Favor small travel and fast settling for routine controls. An entrance around 150–250ms and a shorter exit can be useful, but frequency and purpose decide the timing. Avoid scaling rows from nothing, slow staggered arrivals in working lists, and animation on every streamed update. Animate only what helps someone follow a change.

Keep hover movement behind hover-capable fine-pointer conditions. Essential controls remain available to keyboard and touch users. A close during an open must reverse from the visible state, and an exiting element must stop accepting input. When a dialog or menu primitive already manages presence and focus, use its supported exit lifecycle. Do not add a second unmount timer or competing focus handler. Logical dismissal and focus restoration should follow the primitive's behavior without waiting for decorative exit motion.

Reduced motion reaches the same usable final state without spatial travel. Check completion logic when transitions are removed. Use a dedicated motion skill for complex springs, choreography, or animation architecture; this pass does not require installing another skill package.

## Verify the result people will use

Inspect the combined result after all changes, with the same data before and after. Include a wide screen with a narrow pane, a phone-sized viewport, supported themes, keyboard traversal, and touch-style access. Check mid-transition reversal and reduced motion for motion edits. A resting screenshot cannot establish that an exit animates correctly.

Run the repository's applicable tests, lint, typecheck, and build using its supported runtime. Investigate failures before blaming the patch. When a baseline comparison is needed, reproduce it with the same runtime and configuration. Prefer behavioral checks for the changed path; CSS-string assertions alone cannot establish contrast, geometry, focus visibility, or animation continuity.

Report what changed and why, the checks actually performed, and any remaining uncertainty. Separate observed improvements from token cleanup with no visible effect. Keep descriptions and evidence current after integration. For upstream inspiration, inspect the current source, adapt the principle to this product, and credit public sources. Say when a source was inaccessible instead of inventing a quote or endorsement.
