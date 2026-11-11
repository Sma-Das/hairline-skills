# The spring

`springEasing` samples a critically damped spring into a CSS `linear()` easing, so the
compositor runs it like any other curve and WAAPI or CSS transitions can use it.

## The curve

A critically damped spring released from rest, starting at 0 and settling at 1:

    x(t) = 1 - (1 + t) * e^(-t)

Stiffness `k` scales time (`t = u * k`, with `u` from 0 to 1 over the duration). Giving
it a starting speed `v` (in units of the whole move per unit of `u`) changes the
coefficient:

    x(u) = 1 - (1 + t * (1 - v / k)) * e^(-t),   t = u * k

`springCurve` divides by `x(1)` so the curve lands exactly on 1 at the end of the
duration. Without that, a stiffness of 6.6 ends at 0.990, and the last frame snaps.

## The numbers

- Stiffness 6.6 and 24 samples. It is fast out of rest, has no bounce, and spends the
  last third settling. With 24 samples, the `linear()` string stays short and the
  curve stays smooth.
- `GLIDE` is `springEasing()`, with no starting speed. Use it for the first move.
- `GLIDE_CARRY` is `springEasing(6.6, 24, 3)`, which starts already moving. Use it when
  a running move is cancelled and restarted from its on-screen place. The element
  carries on instead of stopping dead and accelerating again.
- `springAt(u)` is the same curve in JS, for anything that has to keep pace with a
  spring move, such as a figure that counts while its box glides.
- Fallbacks without `linear()` support: `cubic-bezier(0.4, 0, 0.2, 1)` for `GLIDE` and
  `EASE_OUT` for `GLIDE_CARRY`.

## Why not the other curves

- An ease-in-out (`MOVE`) starts from zero speed. On every retarget it stalls, which is
  fine for one move but feels sticky when someone clicks through items quickly.
- A drawer curve covers most of the journey in its first 50ms. On a retarget that
  reads as a snap.
- A bouncy spring overshoots, and data or layout must never overshoot: a tile or a bar
  past its value is briefly wrong.

## Retargeting with WAAPI

1. Read the on-screen value (`getBoundingClientRect`, or the computed `translate` while
   the animation runs).
2. Cancel the running animation.
3. Set the new end state in style.
4. Animate from the read value to the end with `GLIDE_CARRY` if something was running,
   or `GLIDE` if not.

`glideTo` in `patterns.js` does this for `translate`.
