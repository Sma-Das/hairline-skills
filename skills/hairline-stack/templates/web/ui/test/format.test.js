import test from "node:test";
import assert from "node:assert/strict";
import { change, day, dayRange, money, moneyShort } from "../src/lib/format.js";

test("money keeps cents exact", () => {
  assert.equal(money(481240), "$4,812.40");
  assert.equal(money(-5), "-$0.05");
  assert.equal(money(null), "$0.00");
});

test("moneyShort shortens only past ten thousand dollars", () => {
  assert.equal(moneyShort(120400), "$1,204");
  assert.equal(moneyShort(1240000), "$12.4k");
  assert.equal(moneyShort(250000000), "$2.5M");
});

test("change carries direction in the sign and makes no claim without a base", () => {
  assert.deepEqual(change(112, 100), { dir: "up", text: "+12%" });
  assert.deepEqual(change(96, 100), { dir: "down", text: "−4%" });
  assert.deepEqual(change(100.5, 100), { dir: "up", text: "+0.5%" });
  assert.deepEqual(change(5, 0), { dir: "none", text: "" });
  assert.deepEqual(change(7, 7), { dir: "none", text: "" });
});

test("days stay UTC calendar days", () => {
  assert.equal(day("2026-03-04"), "Mar 4");
  assert.equal(dayRange("2026-02-26", "2026-03-27"), "Feb 26 – Mar 27, 2026");
});
