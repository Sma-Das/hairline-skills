// Motion helpers. Every one checks prefers-reduced-motion, and a moved element always
// ends in the same place with or without the animation.

// Things already on screen move with MOVE. Things that arrive or answer a press use
// EASE_OUT. UI motion stays under 300ms.
export const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
export const MOVE = "cubic-bezier(0.77, 0, 0.175, 1)";
export const DRAWER = "cubic-bezier(0.32, 0.72, 0, 1)";

// A critically damped spring sampled into linear(), so the compositor runs it. No bounce,
// no stall at the start: an ease-in-out stalls from zero on every retarget. `speed` is how
// fast the element already moves at the start (in units of the whole move per unit time),
// so one that gets a new target mid-flight carries on instead of stopping dead.
const STIFFNESS = 6.6;

// Normalized so it lands exactly on 1. `at` runs from 0 to 1.
export function springCurve(at, stiffness = STIFFNESS, speed = 0) {
  const raw = (u) => { const t = u * stiffness; return 1 - (1 + t * (1 - speed / stiffness)) * Math.exp(-t); };
  return raw(at) / raw(1);
}
export function springEasing(stiffness = STIFFNESS, samples = 24, speed = 0) {
  const points = [];
  for (let i = 0; i <= samples; i++) points.push((i === samples ? 1 : springCurve(i / samples, stiffness, speed)).toFixed(4));
  return "linear(" + points.join(", ") + ")";
}
// The same curve in JS, for anything that keeps pace with a spring move (a counting figure).
export const springAt = (at) => (at >= 1 ? 1 : springCurve(Math.max(0, at)));
const canSpring = typeof CSS !== "undefined" && CSS.supports?.("animation-timing-function", "linear(0, 1)");
export const GLIDE = canSpring ? springEasing() : "cubic-bezier(0.4, 0, 0.2, 1)";
// For an element that is already moving when it gets a new target.
export const GLIDE_CARRY = canSpring ? springEasing(STIFFNESS, 24, 3) : EASE_OUT;

// A keyboard action takes effect at once. Someone pressing keys is not waiting to watch it.
let keyboardLast = false;
if (typeof document !== "undefined") {
  document.addEventListener("keydown", (e) => { if (!["Shift", "Meta", "Control", "Alt"].includes(e.key)) keyboardLast = true; }, true);
  document.addEventListener("pointerdown", () => { keyboardLast = false; }, true);
}
export const lastInputWasKeyboard = () => keyboardLast;
export const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const lerp = (a, b, t) => a + (b - a) * t;

const quartOut = (t) => 1 - Math.pow(1 - t, 4);

// Runs onFrame(eased 0..1) and returns a cancel function. Reduced motion jumps to the end.
export function tween(duration, onFrame, onDone, ease = quartOut) {
  if (reduced() || duration <= 0) { onFrame(1); onDone?.(); return () => {}; }
  let raf = 0, start = 0;
  const step = (time) => {
    if (!start) start = time;
    const t = Math.min(1, (time - start) / duration);
    onFrame(ease(t));
    if (t < 1) raf = requestAnimationFrame(step); else onDone?.();
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

// A figure counts from what it last showed to its new value. A refresh with no change
// does not move. The first paint counts from 0 only when `from: 0` is passed.
export function countTo(el, value, format, { from = null, duration = 320 } = {}) {
  const target = Number(value) || 0;
  const start = from != null ? from : el._shown != null ? el._shown : target;
  el._cancel?.();
  el._shown = target;
  if (start === target) { el.textContent = format(target); return; }
  el._cancel = tween(duration, (t) => { el.textContent = format(t === 1 ? target : lerp(start, target, t)); });
}

// First, last, invert, play: run mutate(), then glide each element from where it was.
export function flip(elements, mutate, { duration = 280, skip = null } = {}) {
  const list = [...elements];
  if (reduced()) { mutate(); return; }
  const first = new Map(list.map((el) => [el, el.getBoundingClientRect()]));
  mutate();
  for (const el of list) {
    if (el === skip || !el.isConnected) continue;
    const a = first.get(el), b = el.getBoundingClientRect();
    const dx = a.left - b.left, dy = a.top - b.top;
    if ((!dx && !dy) || !b.width) continue;
    el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration, easing: MOVE, composite: "accumulate" });
  }
}

// A staged entrance, for things that appear rarely (a menu, a panel, a first result).
export function enter(el, { y = 8, duration = 280, delay = 0 } = {}) {
  if (!el?.animate) return;
  if (reduced()) { el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120 }); return; }
  el.animate([{ opacity: 0, transform: `translateY(${y}px)` }, { opacity: 1, transform: "none" }], { duration, delay, easing: EASE_OUT, fill: "backwards" });
}

// Runs swap() inside a view transition when the browser has them. Without one, or under
// reduced motion, swap runs at once.
export function viewTransition(swap) {
  if (!document.startViewTransition || reduced() || document.hidden) {
    swap();
    return { ready: Promise.resolve(), done: Promise.resolve() };
  }
  const t = document.startViewTransition(swap);
  t.ready.catch(() => {});
  return { ready: t.updateCallbackDone, done: t.finished.catch(() => {}) };
}

// Theme changes snap. A fade across every token at once smears.
export function setTheme(root, theme, storageKey = "app.theme") {
  const html = document.documentElement;
  html.classList.add("hl-no-transitions");
  if (theme === "light") root.dataset.theme = "light"; else delete root.dataset.theme;
  try { localStorage.setItem(storageKey, JSON.stringify(theme)); } catch { /* private mode */ }
  void html.offsetWidth;
  requestAnimationFrame(() => html.classList.remove("hl-no-transitions"));
}
