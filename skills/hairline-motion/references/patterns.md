# Motion patterns

## Linked analytical inspection

Date hover, arrow-key inspection, and pinned values update immediately. A brief 100ms opacity change can connect a band with its ranked row, but the ranking must not reorder during inspection. Keyboard focus skips even that emphasis transition. A pinned date and a pinned series are separate states; Escape clears both.

Keep the main view mounted when opening the mobile filter dialog. Move the same filter content into a native modal so focus, Escape, and background inertness use browser behavior. Closing or expanding back to desktop restores the content and an appropriate focus target. Use a short drawer transition only if it explains the spatial relationship; reduced motion and rapid dismissal must reach the same state.

During a new-window request, retain the last good chart and dim it only after a slow-request delay. Disable exports until the displayed data matches the selected scope. Theme and family-color changes update all marks together without crossfading through intermediate colors.

Each pattern: what it is for, its numbers, and how it behaves when interrupted.
Helpers are in `assets/js/motion.js` and `assets/js/patterns.js`. The classes are in
`assets/motion.css`.

## Collapse (`.hl-fold`, `toggleFold`)

- The grid row goes from `1fr` to `0fr` over 240ms `EASE_OUT`. Nothing is measured,
  so content that changes while it is open still folds correctly. The body fades to 0
  over 160ms, and its chevron turns -90deg over 200ms.
- The inner element needs `min-height: 0` and `overflow: clip`. Use
  `overflow-clip-margin` so focus rings near the edge are not cut off.
- A folded body is `inert`. If focus was inside it, focus is dropped first.
- Interrupted: a CSS transition reverses from where it is. Nothing extra is needed.
- `<details>`: `::details-content` with `interpolate-size: allow-keywords`, 200ms.
  Browsers without it snap, which is fine.

## Selection marker (`.hl-marker`, `slideMarker`)

- One 1px element under the chosen option, moved with `translateX` and sized with
  `scaleX(width)`. 240ms `MOVE`. Opacity 120ms when it appears or hides.
- The chosen option also carries `aria-pressed` or `aria-current` and full ink, so the
  state does not rest on the motion.
- Interrupted: the transition retargets from where it is.
- A `ResizeObserver` keeps it under the option when fonts load or the bar wraps.

## Reorder (`flip`, `reorder`)

- First, last, invert, play: read every box, run the change, then animate each node
  from its old offset to `none`. 280ms `MOVE` for a section or card reorder, and 300ms
  for a table sort.
- `composite: "accumulate"` lets a node that is already moving take a new offset on
  top of its current one, so a second reorder mid-move does not jump.
- More than 80 rows, or a keyboard action: no motion.
- After the change, put focus back on the same item.

## Drag to reorder

- The lifted item follows the pointer by `transform` (plus `scale(1.01)`). The others
  make room with FLIP over 260ms when the pointer crosses into a new slot. The lifted
  item's start point shifts by how far its slot moved, so it stays under the pointer.
- Near the top or bottom edge (72px), the page auto-scrolls by up to 1/5 of the
  overshoot per frame.
- On drop, `settle` animates from where the item was shown to its slot over 240ms
  `EASE_OUT`. Escape restores the original order and settles the item there.
- Drag is never the only way: give buttons or arrow keys for the same move.

## Counting figures (`countTo`)

- 320ms with a quartic ease-out, from the value last shown. A refresh with no change
  does not move. The first paint shows the value; it counts from 0 only with
  `from: 0`, and only when the arrival is the point.
- Interrupted: the running count is cancelled and a new one starts from the current
  shown value.
- Use tabular figures so the width does not jitter while it counts.

## Slow refresh (`slowFlag`)

- A refetch keeps the old figures. Only after 450ms does it add `.is-refreshing`, which
  dims `.hl-refreshable` to 60% over 160ms. Quick answers never flicker.
- The first load is a 1400ms opacity pulse in the box the content will fill.

## Entrances (`enter`)

- 280ms `EASE_OUT`, from 8px below with opacity 0. Under reduced motion: a 120ms fade.
- For things that appear rarely (a menu, a panel, the first result). Never for every
  list row, and never on a repaint.

## Overlays

- Side sheet (`dialog.hl-sheet`): `translateX(100%)` to `none` over 280ms with the
  drawer curve, using `@starting-style` for the entrance and `overlay` /
  `display allow-discrete` for the exit. The backdrop fades to 60% black over 240ms.
- Palette or popover (`.hl-pop`): from `scale(.98)` at the top edge, transform 160ms,
  opacity 120ms. It answers a key press, so it has to feel instant.
- Toasts and tooltips: opacity only, 100 to 160ms.

## View transitions (`viewTransition`)

- For a page or route swap. The old root fades out in 110ms, and the new one fades in
  over 200ms after 50ms, so they never sit at half opacity together.
- A shared hero (`view-transition-name: hl-hero`) moves its box over 280ms `MOVE`.
  `object-fit: none` and `object-position: left top` keep the text from stretching
  while the box resizes.
- A fixed header and toolbar (`hl-fixed`, `hl-fixed-2`) get `animation: none` and hide
  their old snapshot, so the chrome stays still while the content changes.
- Skip it when the tab is hidden, under reduced motion, or with no browser support.
  The swap still runs.
- Only one name per element on the page. A name used twice aborts the transition.

## Charts

- Keyed marks ease from what is shown to the new values over 280ms. A new window
  length rises from the baseline over 360ms. Later repaints never replay the
  first-paint growth.
- A line draws in once (`.hl-draw-in`, 480ms after 120ms, `pathLength="1"`).
- A calendar fills in by column (`fillInOnce`), 8ms per column with a 300ms fade.
- Hover dims the other marks to 30% over 100ms. There is no motion on the hovered
  mark itself.

## Layout boxes that change size (the treemap glide)

- When an element's fill, text, clipping, and hit area must all follow the same edges,
  animate `left/top/width/height` rather than `transform: scale`, which would stretch
  the text. 440ms `cubic-bezier(0.2, 0, 0, 1)` (`--hl-resize`).
- Only for a few dozen elements, and read every box before you write any style.
- Interrupted: cancel and restart from the on-screen rect (`getBoundingClientRect`),
  never from the old layout box.
- Figures inside count on the same clock as the walls.
- When a move is likely to get a new target before it lands (a pick that follows
  clicks), prefer a spring (`GLIDE`, then `GLIDE_CARRY` on retarget). See `spring.md`.

## Theme

- Theme and palette changes snap: add `hl-no-transitions` to `<html>`, swap, force a
  style flush, and remove it in the next frame (`setTheme`). A fade across every token
  at once smears.
