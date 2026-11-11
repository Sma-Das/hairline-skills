# Implementation traps

Read the sections relevant to the observed failure. These are diagnostic examples, not a replacement stylesheet.

## A wide window with a narrow pane

A viewport media query will not notice an inspector consuming half a workspace. Give a suitable wrapper an inline-size container and query that ancestor from descendants. For example:

```css
.toolbar-pane {
  container: toolbar / inline-size;
}
.toolbar-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.toolbar-primary-action {
  flex: 0 0 auto;
}
@container toolbar (max-width: 32rem) {
  .toolbar-secondary-context {
    display: none;
  }
}
```

Choose the threshold where this product's content stops fitting, including translated and long labels. A query styles descendants of the selected container, not the container itself. Shrinking flex children may need `min-width: 0`; flexible grid tracks may need `minmax(0, 1fr)`.

Introduce containment at the smallest useful boundary. Inspect the actual containing blocks, overflow, and stacking contexts for fixed or absolute overlays. Portals may already solve the positioning problem. Do not put containment on the app root merely to make every query available everywhere. Reconcile old media rules with new container rules so two sets of overrides do not fight.

If a label becomes visually hidden, retain its accessible name through a visually-hidden treatment or `aria-label`. `display: none` removes that label from the accessibility tree. If an entire control disappears, establish that another reachable control provides the same action. A clickable row does not automatically replace a separate disclosure action.

## A nested control with mismatched corners

Use the outer border edge and the inner element's actual edge to calculate the inset. An 8px outer radius with a 1px border and 4px padding suggests a 3px inner radius, assuming those are the only insets. This is a geometry example, not a mandatory radius scale.

When replacing raw radii with tokens, resolve every token in the final theme and cascade. If another change moved `--radius-sm` from 6px to 4px, replacing `6px` with that token is a visible change. Recheck the integrated result and update the description.

## A tiny action with an invisible hit area

Prefer increasing real button padding while preserving alignment. If layout constraints justify a pseudo-element extension, establish its positioning context and verify that no ancestor clips it or neighboring target overlaps it. Click or tap near each edge and between adjacent controls. The DOM bounding rectangle may exclude the extension, so measuring that rectangle alone does not prove the effective hit area.

An inset focus ring can survive an `overflow: hidden` ancestor, but check its contrast and whether content paints over it. Keyboard activation and pointer hit testing are separate checks.

## A menu that fades but snaps in size

Match the transition list to the actual property. This transitions individual scale:

```css
.menu {
  transition: opacity 150ms var(--ease-out), scale 150ms var(--ease-out);
}
```

`transition: transform ...` covers `transform: scale(...)`, but does not cover the individual `scale` property. In a utility framework, inspect the CSS emitted by the classes and the winning easing value. Renaming a utility may leave the computed curve unchanged.

Verify that the component stays mounted for its exit and that dismissed content stops receiving input. If a dialog or menu primitive already handles presence, connect the close state to its supported lifecycle rather than manually unmounting or adding a competing timer. Let it manage focus at logical dismissal; visual exit duration should not leave focus stranded. Check how that lifecycle completes when reduced motion removes the transition. Reopen during exit, close during entry, dismiss with Escape, and repeat with reduced motion. Observe intermediate state or record the interaction; before/after screenshots cannot show continuity.

## A convincing screenshot with incomplete evidence

Check both the narrow viewport and a narrow pane inside a wide viewport. Use identical representative data for comparisons. Include long labels and counts that cross a digit boundary. Toggle filters until no results remain and verify the recovery action. Exercise the actual changed path after combining patches.

Measure rendered colors against the surfaces they occupy. Test focus visibility by tabbing through the clipped region. Inspect motion over time. Treat string-matching tests as guards on source conventions, and pair them with appropriate rendered or behavioral evidence when the claim concerns appearance or interaction.

## Public references

- [WCAG text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) explains ordinary and large-text thresholds and exceptions.
- [WCAG target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) explains the 24 CSS pixel minimum and its spacing and other exceptions.
- [MDN container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries) covers containment setup and ancestor queries.
- [Emil Kowalski's skills](https://github.com/emilkowalski/skills) provide further motion and design-engineering guidance. They are optional reading, not a runtime dependency.

These references support the general techniques. They do not endorse every stylistic choice in this skill.
