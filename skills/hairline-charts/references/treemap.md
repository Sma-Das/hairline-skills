# Treemap: stable layout and glide

## Why not squarified

A squarified layout sorts and packs again on every change, so when two values swap
places, their tiles jump across the map. A reader who was watching one tile loses
it. This layout keeps one structure and moves only its walls. In the dashboard this
was taken from, an update moved tiles a mean of 47px, against 141px for squarified
on the same data.

## The split tree (layout.js)

- `buildTree(items)`: sort by value, largest first, with ties broken by key so the
  same data gives the same tree. Then split the list in two where the halves' weights
  come closest, and recurse. This runs once per level.
- `layoutTree(tree, items, x, y, w, h)`: weigh the tree again with the new values,
  then place it. Each split divides its box by `a.w / node.w`.
- **Axis memory.** A split picks its direction once (`w >= h ? "x" : "y"`) and keeps
  it. Choosing it again from the current size would turn a tile from tall to wide
  over a small change in value.
- **Zero values.** An item with value 0 takes no space and keeps its leaf, so it
  comes back in the same place.
- **New keys.** `insertLeaf` walks to the lightest leaf and pairs the new key with
  it. That moves the fewest other tiles.
- **Bad shapes.** `worstAspect` checks every tile that covers at least 4% of the
  stage. Above 6:1 (`MAX_ASPECT`), the tree is rebuilt once, because a big tile that
  thin cannot be read.
- **New stage shape.** When the stage's aspect ratio changes by more than 10% (a phone
  rotates, or a column collapses), `clearAxes` forgets every direction. The directions
  chosen for a wide stage would be slivers on a narrow one.
- **Levels.** The whole map and the opened tail each keep their own tree.
- `foldTail`: items under 0.6% of the total, or past 24 tiles, fold into one tile.
  A tail of one item stays itself.

## The glide (treemap.js)

- Tiles are absolutely placed, with left, top, width, and height in percent. The glide
  animates those four properties over 440ms with `cubic-bezier(0.2, 0, 0, 1)`. This
  is a layout animation, and it is chosen on purpose: a `transform: scale` would
  stretch the text, while moving the edges keeps the fill, the text, the clipping,
  and the hit area together. A treemap has a few dozen tiles at most, so the layout
  cost is fine.
- **Read, then write.** `paint` reads every tile's `getBoundingClientRect` before it
  writes any style, so a repaint costs one layout.
- **Retarget.** A change mid-move cancels the running animations and starts each tile
  from where it is on screen (`visualRect`), not from its old layout box. It never
  snaps back.
- **Enter.** 200ms, from `scale(.96)` and opacity 0, with `EASE_OUT`.
- **Exit.** The leaving tile is pinned where it was, made `inert`, and faded over
  120ms, then removed. Its neighbors close the gap meanwhile.
- **Figures** count from the shown value to the new one on the same 440ms clock, so a
  number never jumps while its tile slides.
- **No motion** under reduced motion (an entering tile fades in over 120ms), after a
  keyboard action, or on a resize. A resize follows the window, so it repaints in the
  next frame at once.

## Fitting text

- Type sizes come in fixed steps, so a small change in tile size never nudges the
  type. Wide stages: the figure is 28px on tiles 300px or wider and 22px below that,
  falling back to 17px. Narrow stages (under 560px): 20px, falling back to 15px.
- Padding is 28 x 14 (18 x 9 when narrow). The name line is 22px (18px narrow).
- The name needs a tile at least 84px wide. When only one of the two fits, the figure
  wins. The tooltip and the accessible name carry both.
- Text is measured with a canvas, plus 6% for safety.
- A part that does not fit gets `.is-off`: it leaves the flow and fades out over
  120ms. The text nodes are never rebuilt.

## Keyboard and screen readers

- A tile is a button when it can be picked. Its `aria-label` gives the name, the
  figure, and the share of the total. The tail tile adds "Opens them."
- Tab order follows value, largest first. Nodes are reordered only when that order
  changes, and focus stays on the same key.
- Opening the tail focuses its first tile. Escape goes back.
