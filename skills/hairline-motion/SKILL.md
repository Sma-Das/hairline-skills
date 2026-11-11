---
name: hairline-motion
description: "Design and implement restrained, interruptible motion for working interfaces, with immediate reading interactions and complete reduced-motion behavior."
---

# Hairline Motion

Make a change easier to understand without making the person wait for it. In dashboards and analytical tools, motion should explain what arrived, moved, expanded, or disappeared. Preserve the interface's character and use the platform or animation system already present when it can do the job.

## Decide whether the change needs motion

Begin with frequency and purpose. A drawer opening occasionally benefits from a spatial transition. A value inspected dozens of times a minute usually benefits from an immediate response. Typing, keyboard navigation, date inspection, resizing, and appearance changes should not queue animations behind the person's actions.

Do not animate a repaint merely because code ran. Avoid ornamental entrances on every row or section. If the motion does not clarify a state change, remove it.

## Give each movement a consistent character

Use a quick ease-out for arrival and feedback, a stronger ease-in-out for something already on screen changing position, and a drawer curve for sheets. Useful starting points are `cubic-bezier(0.23, 1, 0.32, 1)` for arrival, `cubic-bezier(0.77, 0, 0.175, 1)` for movement, and `cubic-bezier(0.32, 0.72, 0, 1)` for drawers.

Keep ordinary interaction transitions around 120–280ms and exits shorter than entrances. A deliberate layout resize or a first chart draw can take longer when that extra time helps explain the change. Treat those as exceptions, not a new default.

Use transform and opacity where possible. A collapsing section or a few text-bearing chart tiles may need layout animation; choose it deliberately, batch measurements before writes, and keep the work bounded. Avoid bounce or overshoot on data and layout: a bar beyond its value is briefly wrong.

## Design the interruption before the entrance

Every new target starts from what is visible now. A drawer must reverse when closed mid-open; a chart must continue from its intermediate values; a moved tile must not snap back to its old box. For frequently retargeted movement, a damped spring can carry velocity into the next target.

Make an exiting element stop accepting input immediately. Keep focus attached to the same meaningful object, and restore it to the opener when a dialog closes. Never delay the underlying action until the animation finishes.

## Apply restraint to analysis

Let chart hover, keyboard focus, and pinned inspection update the same readout immediately. A brief opacity emphasis can connect a ranked row with its band, but it must not reorder the list or become the only indication of selection. Keep pinned state explicit through words or control state.

Animate a filter dialog to explain where it came from only when the interaction benefits from that movement. Preserve the current chart and figures during a refetch. Apply theme and palette changes together without fading through intermediate colors.

When reduced motion is requested, reach the same final state without spatial travel. Keyboard actions and resizes remain immediate regardless of that preference. Do not hide information or break completion logic when animation is removed.

Use the [pattern guidance](references/patterns.md) for specific interactions and the [spring guidance](references/spring.md) when continuity requires a spring. Inspect rapid repeated input, reversal, dismissal, reduced motion, and keyboard use in the actual interface; a pleasant first entrance is only the beginning of the implementation.
