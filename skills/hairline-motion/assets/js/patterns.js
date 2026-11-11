// Motion patterns built on motion.js. Each one checks reduced motion and the last input,
// and each ends in the same state with or without the animation.
import { EASE_OUT, GLIDE, GLIDE_CARRY, flip, lastInputWasKeyboard, reduced } from "./motion.js";

// Fold or unfold a .hl-fold. The folded body leaves the tab order too, so focus never
// lands on something hidden. Returns the new folded state.
export function toggleFold(fold, folded = !fold.classList.contains("is-folded")) {
  const inner = fold.querySelector(":scope > .hl-fold-inner");
  if (folded && inner?.contains(document.activeElement)) document.activeElement.blur();
  fold.classList.toggle("is-folded", folded);
  if (inner) inner.inert = folded;
  return folded;
}

// Slide one 1px .hl-marker under the chosen option. Scaling a 1px element costs no
// layout; animating width would.
export function slideMarker(host, selector = '[aria-pressed="true"], [aria-current="page"]') {
  if (!host) return;
  let marker = host.querySelector(":scope > .hl-marker");
  if (!marker) {
    marker = document.createElement("span");
    marker.className = "hl-marker";
    marker.setAttribute("aria-hidden", "true");
    host.prepend(marker);
    // Fonts and wrapping move the options, so the marker follows the host's size.
    if (typeof ResizeObserver !== "undefined") new ResizeObserver(() => slideMarker(host, selector)).observe(host);
  }
  const on = [...host.querySelectorAll(selector)].find((n) => !n.hidden);
  if (!on || !on.offsetWidth) { marker.style.opacity = "0"; return; }
  marker.style.opacity = "1";
  marker.style.transform = `translateX(${on.offsetLeft}px) scaleX(${on.offsetWidth})`;
}

// Set .is-refreshing on host only when a request is slow, so a quick one never flickers.
export function slowFlag(host, promise, after = 450) {
  const timer = setTimeout(() => host.classList.add("is-refreshing"), after);
  return Promise.resolve(promise).finally(() => { clearTimeout(timer); host.classList.remove("is-refreshing"); });
}

// Reorder children with FLIP. mutate() moves the nodes; everyone else glides. Long lists
// skip it: past `max` items the motion is noise and the cost is real.
export function reorder(nodes, mutate, { duration = 280, max = 80 } = {}) {
  const list = [...nodes].filter((n) => n.isConnected && !n.hidden);
  if (lastInputWasKeyboard() || list.length > max) { mutate(); return; }
  flip(list, mutate, { duration });
}

// Move an element by transform to a new offset, and retarget mid-move from where it is
// on screen. A moving element keeps its momentum (GLIDE_CARRY) instead of stopping dead.
// Use it for things that may get a new target before they arrive: a dragged card's
// home, a selection highlight following arrow-free clicks, a panel that follows a pick.
export function glideTo(el, x, y, { duration = 420 } = {}) {
  const running = el.getAnimations().filter((a) => a.id === "hl-glide" && a.playState === "running");
  // Computed style includes a running animation, so this is the on-screen place.
  const from = getComputedStyle(el).translate;
  running.forEach((a) => a.cancel());
  const to = `${x}px ${y}px`;
  el.style.translate = to;
  if (reduced() || lastInputWasKeyboard() || from === to) return;
  const anim = el.animate([{ translate: from === "none" ? "0px 0px" : from }, { translate: to }], { duration, easing: running.length ? GLIDE_CARRY : GLIDE });
  anim.id = "hl-glide";
}

// Settle a dropped item from where the pointer left it to its slot.
export function settle(node, shown, { duration = 240 } = {}) {
  if (reduced()) return;
  const rest = node.getBoundingClientRect();
  const dx = shown.left - rest.left, dy = shown.top - rest.top;
  if (!dx && !dy) return;
  node.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration, easing: EASE_OUT });
}

// Fill a grid in by column once, the first time it is seen. Cells carry --col.
export function fillInOnce(host, columns, { step = 8, length = 300 } = {}) {
  if (host.dataset.filled || reduced()) return;
  host.dataset.filled = "1";
  host.classList.add("hl-fill-in", "is-filling");
  setTimeout(() => host.classList.remove("is-filling"), columns * step + length + 50);
}
