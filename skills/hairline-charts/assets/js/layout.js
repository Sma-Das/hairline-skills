// A treemap layout that keeps its structure while values change. Squarified layouts
// re-sort on every change, so tiles jump across the map; this one is a binary split
// tree built once, then re-weighed. A new value slides the walls between tiles, and
// each tile stays near where it was. Pure functions, no DOM, so they test in Node.

// Halves by weight, largest first. Ties sort by key so the same data builds the same tree.
export function buildTree(items) {
  const list = items.filter((item) => item.value > 0).slice().sort((a, b) => b.value - a.value || String(a.key).localeCompare(String(b.key)));
  return list.length ? branch(list) : null;
}

function branch(list) {
  if (list.length === 1) return { key: list[0].key };
  const total = list.reduce((n, item) => n + item.value, 0);
  let sum = 0, best = Infinity, index = 1;
  for (let i = 0; i < list.length - 1; i++) {
    sum += list[i].value;
    const gap = Math.abs(total / 2 - sum);
    if (gap < best) { best = gap; index = i + 1; }
  }
  return { a: branch(list.slice(0, index)), b: branch(list.slice(index)) };
}

function weigh(node, values) {
  if (node.key !== undefined) return (node.w = Math.max(0, values.get(node.key) || 0));
  return (node.w = weigh(node.a, values) + weigh(node.b, values));
}

// A stage of a new shape needs new split directions: the ones chosen for a wide stage
// would be slivers on a phone.
export function clearAxes(node) {
  if (!node || node.key !== undefined) return;
  delete node.axis;
  clearAxes(node.a);
  clearAxes(node.b);
}

export function treeKeys(node, out = new Set()) {
  if (!node) return out;
  if (node.key !== undefined) out.add(node.key);
  else { treeKeys(node.a, out); treeKeys(node.b, out); }
  return out;
}

// A key the tree has not seen goes beside the lightest leaf, which moves the fewest others.
export function insertLeaf(tree, key, values) {
  if (!tree) return { key };
  weigh(tree, values);
  let parent = null, side = "", node = tree;
  while (node.key === undefined) {
    parent = node;
    side = node.a.w <= node.b.w ? "a" : "b";
    node = node[side];
  }
  const pair = { a: node, b: { key } };
  if (!parent) return pair;
  parent[side] = pair;
  return tree;
}

// Rectangles in the tree's fixed structure. An item with no value takes no space and
// its walls close up; it keeps its leaf, so it comes back in the same place.
export function layoutTree(tree, items, x, y, width, height) {
  if (!tree || !(width > 0) || !(height > 0)) return [];
  const byKey = new Map(items.map((item) => [item.key, item]));
  weigh(tree, new Map(items.map((item) => [item.key, item.value])));
  const out = [];
  const place = (node, nx, ny, w, h) => {
    if (!node.w) return;
    if (node.key !== undefined) { out.push({ ...byKey.get(node.key), x: nx, y: ny, width: w, height: h }); return; }
    const ratio = node.a.w / node.w;
    // A split keeps its direction once chosen. Re-deciding it from the current size
    // would turn a tile from tall to wide over a small change in value.
    if (!node.axis) node.axis = w >= h ? "x" : "y";
    if (node.axis === "x") {
      place(node.a, nx, ny, w * ratio, h);
      place(node.b, nx + w * ratio, ny, w * (1 - ratio), h);
    } else {
      place(node.a, nx, ny, w, h * ratio);
      place(node.b, nx, ny + h * ratio, w, h * (1 - ratio));
    }
  };
  place(tree, x, y, width, height);
  return out;
}

// The aspect ratio of the most stretched tile big enough to matter (4% of the stage).
// Past a limit the caller rebuilds the tree once, rather than leave a big tile unreadable.
export function worstAspect(rects, width, height) {
  const floor = width * height * 0.04;
  return rects.reduce((worst, r) => (r.width * r.height < floor ? worst : Math.max(worst, r.width / r.height, r.height / r.width)), 1);
}

// Folds the long tail into one tile: anything under minShare of the total, or past
// maxTiles. A tail of one item is not worth a fold, so it stays itself.
export function foldTail(items, { minShare = 0.006, maxTiles = 24 } = {}) {
  const list = items.filter((item) => item.value > 0).slice().sort((a, b) => b.value - a.value || String(a.key).localeCompare(String(b.key)));
  const total = list.reduce((n, item) => n + item.value, 0);
  const keep = [], rest = [];
  list.forEach((item) => (keep.length < maxTiles && item.value >= total * minShare ? keep : rest).push(item));
  if (rest.length <= 1) return { keep: list, rest: [] };
  return { keep, rest };
}
