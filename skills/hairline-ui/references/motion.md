# Motion

Motion explains a change of place or state. It is never decoration, and it never
delays someone who is acting. Helpers are in `assets/js/motion.js`.

## Curves and durations

- `EASE_OUT` `cubic-bezier(0.23, 1, 0.32, 1)`: things that arrive or answer a press
  (menus, toasts, tooltips, collapse, entrance). 120–280ms.
- `MOVE` `cubic-bezier(0.77, 0, 0.175, 1)`: things already on screen that change place
  (the nav thumb, FLIP reorder). 240–280ms.
- `DRAWER` `cubic-bezier(0.32, 0.72, 0, 1)`: sheets and drawers. 280ms.
- `GLIDE`: a critically damped spring sampled into `linear()`, for moves that may be
  retargeted mid-flight. `springEasing(stiffness, samples, speed)` keeps momentum.
- Color and opacity on hover: 100–120ms `ease-out`.
- Nothing in the UI runs longer than 300ms, except a figure counting (320ms) and the
  loading pulse (1400ms loop).

## Rules

- Animate `transform` and `opacity`. Collapse animates `grid-template-rows` from `1fr`
  to `0fr`, so nothing is measured. The thumb is a 1px element scaled with `scaleX`.
- A keyboard action takes effect at once (`lastInputWasKeyboard()`). Someone pressing
  keys is not waiting to watch.
- Theme and palette changes snap (`setTheme`, the `hl-no-transitions` class for one
  frame). A fade across every token smears.
- Figures count from what they last showed (`countTo`). A refresh with no change does
  not move. The first paint does not count up from zero unless that is the point.
- Charts do not animate in on every repaint. Hover dims the other marks to 30% opacity.
- A refetch keeps the last figures and dims them to 60%, only after 450ms
  (`slowFlag`), so fast responses never flicker.
- The first load is an opacity pulse in the box the content will fill, not a skeleton
  shaped like fake content.
- Entrances (`enter`) are for things that appear rarely: a menu, a panel, the first
  result. Not for every list row.
- Reorder with FLIP (`flip`). Page swaps may use a view transition (`viewTransition`).
- Press feedback: `scale: .96` on `:active` for buttons. No press scale on rows.
- `prefers-reduced-motion`: every helper jumps to the end state; the CSS sets durations
  to 1ms and removes press scale. The end state is always identical with or without it.
- Hover styles live inside `@media (hover: hover) and (pointer: fine)`, so touch never
  sticks.
