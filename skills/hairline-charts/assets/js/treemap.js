// A treemap of absolutely placed tiles over the stable split layout in layout.js.
// Each tile animates its own left/top/width/height, so its fill, text, clipping, and
// hit area follow the same edges. That is a layout animation, chosen on purpose: a
// scaled tile would stretch its text. A change caught mid-move continues from where
// the tile is on screen. Keyboard actions and window resizes repaint with no motion.
import { buildTree, clearAxes, foldTail, insertLeaf, layoutTree, treeKeys, worstAspect } from "./layout.js";
import { EASE_OUT, lastInputWasKeyboard, lerp, reduced, tween } from "./motion.js";
import { bindTip, hideTip, tipRow, tipTitle } from "./tooltip.js";

const MOVE_MS = 440;
const RESIZE_EASE = "cubic-bezier(0.2, 0, 0, 1)";
const ENTER_MS = 200;
const EXIT_MS = 120;
// Past this, a big tile is too thin to read, so the layout is rebuilt once.
const MAX_ASPECT = 6;

const pct = (n) => n.toFixed(3) + "%";

function textWidth(text, size, font) {
  const canvas = textWidth.canvas || (textWidth.canvas = document.createElement("canvas"));
  const ctx = canvas.getContext("2d");
  ctx.font = "500 " + size + "px " + font;
  return ctx.measureText(String(text)).width * 1.06;
}

export function createTreemap(host, options = {}) {
  const opts = {
    format: (v) => v.toLocaleString("en-US"),
    onPick: null,
    onLevel: null,
    fold: { minShare: 0.006, maxTiles: 24 },
    words: { empty: "Nothing to show.", smaller: (n) => n + " smaller", ofTotal: "of the total", open: "Opens them." },
    ...options,
  };
  host.classList.add("hl-treemap");
  const font = getComputedStyle(host).fontFamily || "sans-serif";
  const state = { items: [], tail: false, width: 0, height: 0 };
  const tiles = new Map();
  // One fixed structure per level (the whole map, the opened tail).
  const trees = new Map();
  let treeShape = 0;
  let emptyNote = null;
  let cancelValues = null;

  const share = (v, whole) => (whole ? ((v / whole) * 100).toFixed(v / whole < 0.1 ? 1 : 0) + "%" : "");

  function itemsNow() {
    const { keep, rest } = foldTail(state.items, opts.fold);
    if (state.tail) return rest;
    if (!rest.length) return keep;
    return [...keep, { key: "\u0000tail", isTail: true, name: opts.words.smaller(rest.length), value: rest.reduce((n, i) => n + i.value, 0), members: rest, color: "var(--hl-muted)" }];
  }

  // Fixed type steps, so a small change in tile size never nudges the type.
  function fit(r, stageWidth) {
    const narrow = stageWidth < 560;
    const padX = narrow ? 18 : 28, padY = narrow ? 9 : 14, nameLine = narrow ? 18 : 22;
    const amount = opts.format(r.value);
    const inner = r.width - padX;
    const large = narrow ? 20 : r.width >= 300 ? 28 : 22;
    const small = narrow ? 15 : 17;
    let size = large;
    let amountFits = inner >= textWidth(amount, size, font) + 2;
    if (!amountFits && inner >= textWidth(amount, small, font) + 2) { size = small; amountFits = true; }
    const line = Math.ceil(size * 1.3);
    const nameFits = r.width >= 84 && r.height >= padY + nameLine + 4;
    const both = padY + nameLine + 8 + line + padY;
    const showValue = amountFits && r.height >= (nameFits ? padY + nameLine + 8 : 8) + line + padY;
    // The figure wins over the name when only one fits; the tooltip and label carry both.
    const showName = nameFits && (!showValue || r.height >= both);
    return { amount, size, showName, showValue };
  }

  function makeTile(item) {
    const clickable = item.isTail || !!opts.onPick;
    const tile = document.createElement(clickable ? "button" : "div");
    tile.className = "hl-tile";
    if (clickable) tile.type = "button";
    tile.dataset.key = item.key;
    const name = document.createElement("span");
    name.className = "hl-tile-name";
    const value = document.createElement("span");
    value.className = "hl-tile-value";
    tile.append(name, value);
    tile._parts = { name, value };
    if (clickable) {
      tile.addEventListener("click", (e) => {
        hideTip();
        if (tile._item.isTail) openTail();
        else opts.onPick(tile._item, tile, e);
      });
    }
    bindTip(tile, () => tile._tip());
    return tile;
  }

  // Text nodes stay in place. What fits is shown or hidden with a short fade.
  function fillTile(tile, r, whole, stageWidth) {
    const f = fit(r, stageWidth);
    const { name, value } = tile._parts;
    tile.style.setProperty("--c", r.color);
    if (name.textContent !== r.name) name.textContent = r.name;
    name.classList.toggle("is-off", !f.showName);
    value.classList.toggle("is-off", !f.showValue);
    value.style.fontSize = f.size + "px";
    tile._target = r.value;
    tile._tip = () => {
      const parts = [tipTitle(r.name), tipRow(opts.format(r.value), share(r.value, whole) + " " + opts.words.ofTotal)];
      if (r.isTail) r.members.slice(0, 5).forEach((m) => parts.push(tipRow(opts.format(m.value), m.name)));
      return parts;
    };
    // The accessible name says everything a sighted reader gets from the tile.
    tile.setAttribute("aria-label", r.name + ", " + f.amount + ", " + share(r.value, whole) + " " + opts.words.ofTotal + (r.isTail ? ". " + opts.words.open : ""));
  }

  function setRect(tile, rect) {
    tile.style.left = pct(rect.x);
    tile.style.top = pct(rect.y);
    tile.style.width = pct(rect.w);
    tile.style.height = pct(rect.h);
  }
  // Where a tile is on screen now. Mid-move this is not its layout place, and a new
  // change carries on from here instead of jumping back.
  const visualRect = (tile, box) => { const b = tile.getBoundingClientRect(); return { x: b.left - box.left, y: b.top - box.top, w: b.width, h: b.height }; };
  const stopMotion = (tile) => tile.getAnimations().forEach((a) => a.cancel());
  const rectFrame = (r) => ({ left: r.x + "px", top: r.y + "px", width: r.w + "px", height: r.h + "px" });
  function glide(tile, from, to) {
    if (["x", "y", "w", "h"].every((k) => Math.abs(from[k] - to[k]) < 0.5)) return;
    tile.animate([rectFrame(from), rectFrame(to)], { duration: MOVE_MS, easing: RESIZE_EASE });
  }
  function enterTile(tile) {
    if (reduced()) { tile.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120, easing: "ease-out" }); return; }
    tile.animate([{ opacity: 0, transform: "scale(0.96)" }, { opacity: 1, transform: "none" }], { duration: ENTER_MS, easing: EASE_OUT });
  }
  // A leaving tile stops taking space at once, so its neighbors close the gap while it fades.
  function exitTile(tile, box) {
    const from = visualRect(tile, box);
    stopMotion(tile);
    setRect(tile, { x: (from.x / box.width) * 100, y: (from.y / box.height) * 100, w: (from.w / box.width) * 100, h: (from.h / box.height) * 100 });
    tile.classList.add("is-exit");
    tile.setAttribute("inert", "");
    tile.animate([{ opacity: 1 }, { opacity: 0 }], { duration: EXIT_MS, easing: EASE_OUT, fill: "forwards" }).finished.catch(() => {}).then(() => tile.remove());
  }

  // Figures count while the walls move, on the same clock, so a number never jumps while its tile slides.
  function runValues(moves, animate) {
    cancelValues?.();
    cancelValues = null;
    const counting = [];
    moves.forEach(({ tile, to }) => {
      const node = tile._parts.value;
      if (!animate || tile._shown == null || tile._shown === to) { node.textContent = opts.format(to); tile._shown = to; }
      else counting.push({ tile, node, from: tile._shown, to });
    });
    if (!counting.length) return;
    cancelValues = tween(MOVE_MS, (t) => counting.forEach((c) => {
      c.tile._shown = t === 1 ? c.to : lerp(c.from, c.to, t);
      c.node.textContent = opts.format(c.tile._shown);
    }));
  }

  function solve(items, width, height) {
    const key = state.tail ? "tail" : "root";
    const live = items.filter((i) => i.value > 0);
    let tree = trees.get(key) || buildTree(live);
    // A stage of a new shape chooses its split directions again.
    const shape = width / height;
    if (treeShape && Math.abs(shape - treeShape) / treeShape > 0.1) trees.forEach(clearAxes);
    treeShape = shape;
    const values = new Map(live.map((i) => [i.key, i.value]));
    const known = treeKeys(tree);
    live.forEach((i) => { if (!known.has(i.key)) tree = insertLeaf(tree, i.key, values); });
    let rects = layoutTree(tree, live, 0, 0, width, height);
    if (worstAspect(rects, width, height) > MAX_ASPECT) {
      tree = buildTree(live);
      rects = layoutTree(tree, live, 0, 0, width, height);
    }
    trees.set(key, tree);
    return rects;
  }

  function paint({ instant = false } = {}) {
    const width = host.clientWidth, height = host.clientHeight;
    if (!width || !height) return;
    state.width = width;
    state.height = height;
    const rects = solve(itemsNow(), width, height);
    const whole = rects.reduce((n, r) => n + r.value, 0);
    const animate = !instant && !reduced() && !lastInputWasKeyboard();
    const box = host.getBoundingClientRect();
    // Read every tile's place before writing anything, so this costs one layout.
    const visual = new Map();
    if (animate) tiles.forEach((tile, key) => visual.set(key, visualRect(tile, box)));
    if (!rects.length) {
      emptyNote ||= Object.assign(document.createElement("p"), { className: "hl-treemap-empty", textContent: opts.words.empty });
      host.appendChild(emptyNote);
    } else emptyNote?.remove();

    const seen = new Set();
    const focusedKey = host.contains(document.activeElement) ? document.activeElement.dataset.key : null;
    const moves = [], runs = [];
    rects.forEach((r) => {
      seen.add(r.key);
      let tile = tiles.get(r.key);
      const isNew = !tile;
      if (isNew) { tile = makeTile(r); tiles.set(r.key, tile); host.appendChild(tile); }
      else stopMotion(tile);
      tile._item = r;
      fillTile(tile, r, whole, width);
      moves.push({ tile, to: r.value });
      setRect(tile, { x: (r.x / width) * 100, y: (r.y / height) * 100, w: (r.width / width) * 100, h: (r.height / height) * 100 });
      if (!animate) return;
      const was = visual.get(r.key);
      if (isNew) runs.push(() => enterTile(tile));
      else if (was) runs.push(() => glide(tile, was, { x: r.x, y: r.y, w: r.width, h: r.height }));
    });
    tiles.forEach((tile, key) => {
      if (seen.has(key)) return;
      tiles.delete(key);
      if (animate) exitTile(tile, box); else tile.remove();
    });
    // Tab order follows value, largest first. Reinsert only when it changed, and keep focus.
    const order = rects.slice().sort((a, b) => b.value - a.value).map((r) => tiles.get(r.key));
    const current = [...host.children].filter((n) => n.classList.contains("hl-tile") && !n.classList.contains("is-exit"));
    if (order.some((t, i) => current[i] !== t)) {
      order.forEach((t) => host.appendChild(t));
      if (focusedKey && tiles.get(focusedKey)) tiles.get(focusedKey).focus({ preventScroll: true });
    }
    runs.forEach((run) => run());
    runValues(moves, animate);
  }

  function openTail() {
    state.tail = true;
    opts.onLevel?.({ tail: true, back: closeTail });
    paint();
    host.querySelector(".hl-tile")?.focus({ preventScroll: true });
  }
  function closeTail() {
    state.tail = false;
    opts.onLevel?.({ tail: false, back: null });
    paint();
  }

  let resizeFrame = 0;
  const watch = new ResizeObserver(() => {
    const width = host.clientWidth, height = host.clientHeight;
    // Hidden: forget the size, so showing it again repaints whatever arrived meanwhile.
    if (!width || !height) { state.width = state.height = 0; return; }
    if (width === state.width && height === state.height) return;
    cancelAnimationFrame(resizeFrame);
    // A resize follows the window, so it repaints with no glide.
    resizeFrame = requestAnimationFrame(() => paint({ instant: true }));
  });
  watch.observe(host);
  host.addEventListener("keydown", (e) => { if (e.key === "Escape" && state.tail) { e.preventDefault(); closeTail(); } });

  return {
    // items: [{ key, name, value, color }]
    update(items) {
      state.items = (items || []).filter((i) => Number(i.value) > 0);
      paint();
    },
    back: closeTail,
    // New data with different keys: forget the structure rather than bend the old one.
    reset() { trees.clear(); },
    destroy() { watch.disconnect(); cancelValues?.(); },
  };
}
