---
name: hairline-motion
description: "Add restrained UI motion to dashboards and tools: curves, durations, FLIP, springs, view transitions, reduced motion."
---

# Hairline motion

Motion for working interfaces: dashboards, admin tools, and data desks, where people
come back every day and click quickly. Motion here explains a change of place or
state. It is never decoration, and it never makes someone wait.

It works with any design. `hairline-ui` components already follow these rules, and
`hairline-charts` uses the same helpers.

## Files

- `assets/js/motion.js`: curves (`EASE_OUT`, `MOVE`, `DRAWER`), the spring (`springEasing`,
  `springCurve`, `springAt`, `GLIDE`, `GLIDE_CARRY`), `reduced`,
  `lastInputWasKeyboard`, `tween`, `lerp`, `countTo`, `flip`, `enter`, `viewTransition`,
  and `setTheme`. This is the same file as `hairline-ui/assets/js/motion.js`. Keep the
  two identical.
- `assets/js/patterns.js`: `toggleFold`, `slideMarker`, `slowFlag`, `reorder`,
  `glideTo` (spring with retarget), `settle` (after a drop), and `fillInOnce`.
- `assets/motion.css`: tokens, `.hl-fold`, `.hl-marker`, `dialog.hl-sheet`, `.hl-pop`,
  `.hl-press`, `.hl-refreshable`, `.hl-wait`, `.hl-draw-in`, `.hl-fill-in`, hover inside
  the hover media query, view-transition rules, and the reduced-motion block.
- `assets/demo.html`: every pattern on one page. Serve it over HTTP.
- `references/patterns.md`: each pattern with its numbers and how it behaves when
  interrupted. Read it before you add motion.
- `references/spring.md`: the spring math and when to use it.

## Decide in this order

1. **Should it move at all?** Animate a change that would otherwise be lost: something
   arrived, left, or moved, or a state flipped. Do not animate keyboard actions,
   things that happen hundreds of times a day (typing, row hover, tab switches within
   a pane), or a repaint with no change. When unsure, leave it out.
2. **What is it for?** Each kind of change has one curve:
   - Arrives, or answers a press: `EASE_OUT` `cubic-bezier(0.23, 1, 0.32, 1)`,
     120 to 280ms.
   - Already on screen and changes place: `MOVE` `cubic-bezier(0.77, 0, 0.175, 1)`,
     240 to 280ms.
   - Sheets and drawers: `DRAWER` `cubic-bezier(0.32, 0.72, 0, 1)`, 280ms.
   - A layout box that changes size with text inside:
     `cubic-bezier(0.2, 0, 0, 1)`, 440ms.
   - Likely to be retargeted mid-move: the spring, `GLIDE`, then `GLIDE_CARRY`.
   - Color and opacity on hover: 100 to 120ms `ease-out`.
3. **Which properties?** `transform` and `opacity`. Collapse goes through
   `grid-template-rows`. A marker is a 1px element scaled with `scaleX`. Animate
   `left/top/width/height` only for a few dozen boxes whose text must not stretch,
   and read every box before writing any style.
4. **How long?** UI motion stays under 300ms. The exceptions: a counting figure (320ms),
   a resizing layout (440ms), a line drawing in (480ms), and the loading pulse (a
   1400ms loop). Exits are faster than entrances.
5. **What happens when it is interrupted?** Every move starts from where the element
   is on screen, never from its old layout box. CSS transitions reverse on their own.
   WAAPI moves cancel and restart from `getBoundingClientRect` or the computed style.
   A spring restart carries its speed (`GLIDE_CARRY`). A counting figure continues
   from the value it shows.
6. **How does it leave?** An exiting element stops taking space and stops taking
   input (`inert`, `pointer-events: none`) at once, then fades. Its neighbors close
   the gap while it goes.
7. **What if motion is off?**
   - `prefers-reduced-motion`: every helper jumps to the end state, and the CSS sets
     durations to 1ms and removes press scale. A fade may stay where a jump would be
     lost. The end state is the same either way.
   - A keyboard action takes effect at once (`lastInputWasKeyboard()`).
   - A resize follows the window with no motion.
   - Theme and palette changes snap (`setTheme`, `hl-no-transitions`).

## Rules that are easy to break

- No bounce or overshoot on data or layout. A bar past its value is briefly wrong.
- No entrance on every repaint or every list row. First paint only, and only where the
  arrival is the point.
- No skeletons shaped like fake content. Pulse the box the content will fill.
- A refetch keeps what is shown and dims it only after 450ms (`slowFlag`).
- Press feedback is `scale: .96` on buttons and `.98` on large targets. None on rows.
- Hover rules live inside `@media (hover: hover) and (pointer: fine)`.
- State never rests on motion alone: the chosen option also has `aria-pressed` and full
  ink, and a moved item keeps focus.
- Drag is never the only way to reorder. Offer buttons or arrow keys.
- One `view-transition-name` per element on the page. A duplicate aborts the
  transition.

## Check it

Open `assets/demo.html` over HTTP. Click each control twice quickly, so the second
click lands mid-move. Repeat with the keyboard (it should be instant) and with reduced
motion turned on in DevTools rendering settings (it should end in the same state).
