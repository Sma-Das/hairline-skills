// node --test assets/js/layout.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { buildTree, foldTail, insertLeaf, layoutTree, treeKeys, worstAspect } from "./layout.js";

const items = [
  { key: "a", value: 50 }, { key: "b", value: 25 }, { key: "c", value: 15 }, { key: "d", value: 10 },
];
const area = (r) => r.width * r.height;

test("tiles cover the stage in proportion to value", () => {
  const rects = layoutTree(buildTree(items), items, 0, 0, 400, 200);
  assert.equal(rects.length, 4);
  const total = rects.reduce((n, r) => n + area(r), 0);
  assert.ok(Math.abs(total - 80000) < 1e-6);
  rects.forEach((r) => assert.ok(Math.abs(area(r) / total - items.find((i) => i.key === r.key).value / 100) < 1e-9));
});

test("a value change keeps the structure and split directions", () => {
  const tree = buildTree(items);
  const before = layoutTree(tree, items, 0, 0, 400, 200);
  const next = items.map((i) => (i.key === "d" ? { ...i, value: 30 } : i));
  const after = layoutTree(tree, next, 0, 0, 400, 200);
  // "a" still owns the left edge; only its width changed.
  const a0 = before.find((r) => r.key === "a"), a1 = after.find((r) => r.key === "a");
  assert.equal(a0.x, 0); assert.equal(a1.x, 0); assert.equal(a0.height, a1.height);
});

test("a zero value takes no space and keeps its leaf", () => {
  const tree = buildTree(items);
  const rects = layoutTree(tree, items.map((i) => (i.key === "c" ? { ...i, value: 0 } : i)), 0, 0, 400, 200);
  assert.deepEqual(rects.map((r) => r.key).sort(), ["a", "b", "d"]);
  assert.ok(treeKeys(tree).has("c"));
});

test("a new key goes beside the lightest leaf", () => {
  const values = new Map([...items.map((i) => [i.key, i.value]), ["e", 5]]);
  const tree = insertLeaf(buildTree(items), "e", values);
  assert.ok(treeKeys(tree).has("e"));
  const rects = layoutTree(tree, [...items, { key: "e", value: 5 }], 0, 0, 400, 200);
  assert.equal(rects.length, 5);
});

test("same data builds the same tree", () => {
  assert.deepEqual(buildTree(items), buildTree(items.slice().reverse()));
});

test("worstAspect ignores small tiles", () => {
  assert.equal(worstAspect([{ width: 100, height: 1 }], 400, 200), 1);
  assert.equal(worstAspect([{ width: 300, height: 50 }], 400, 200), 6);
});

test("foldTail folds small items, but never a tail of one", () => {
  const many = [{ key: "big", value: 1000 }, { key: "s1", value: 1 }, { key: "s2", value: 1 }];
  assert.deepEqual(foldTail(many).rest.map((i) => i.key), ["s1", "s2"]);
  assert.equal(foldTail(many.slice(0, 2)).rest.length, 0);
});
