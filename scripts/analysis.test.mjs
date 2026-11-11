import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { shareData, rankShares, balanceData, observedRuns } from "../skills/hairline-charts/assets/js/analysis.js";
import { parseViewState, viewQuery, viewURL } from "../skills/hairline-ui/assets/js/view-state.js";
import { familyColor, FAMILY_TONES } from "../skills/hairline-ui/assets/js/family.js";
import { build, contrast, presets } from "../skills/hairline-ui/scripts/palette.mjs";

const series = (a, b) => [{ key: "a", label: "A", values: a }, { key: "b", label: "B", values: b }];
test("shares conserve 100 and distinguish recorded zeroes from missing or empty days", () => {
  const data = shareData(series([0, 4, null, 0], [3, 6, 8, 0]));
  assert.deepEqual(data.totals, [3, 10, null, null]);
  assert.deepEqual(data.series[0].values, [0, 40, null, null]);
  assert.equal(data.completeDays, 2);
  for (const index of [0, 1]) assert.equal(data.series.reduce((sum, row) => sum + row.values[index], 0), 100);
});
test("period share is volume weighted; changes use observed endpoints and pp", () => {
  const data = shareData(series([9, 1], [1, 99]));
  const row = rankShares(data).find((row) => row.key === "a");
  assert.ok(Math.abs(row.share - 1000 / 110) < 1e-10);
  assert.equal(row.changePp, -89);
  assert.equal(rankShares(data, 0).find((row) => row.key === "a").share, 90);
  assert.equal(rankShares(shareData(series([null, 4], [8, 6])))[0].changePp, null);
});
test("missing dates break runs and a single observed date remains available", () => {
  assert.deepEqual(observedRuns([null, 1, 2, null, 3, undefined, NaN]), [[1, 2], [4]]);
  assert.deepEqual(balanceData([60, null, 0, 0, 40], [40, 20, 0, 10, 60]), [20, null, null, -100, -20]);
  assert.equal(rankShares(shareData(series([0], [0])))[0].share, null);
});
test("misaligned and duplicate series fail instead of silently changing totals", () => {
  assert.throws(() => shareData(series([1], [2, 3])), /align/);
  assert.throws(() => shareData([{ key: "a", values: [1] }, { key: "a", values: [2] }]), /unique/);
  assert.throws(() => balanceData([1], []), /align/);
});
const options = { charts: ["share", "balance"], days: [7, 30, 90], groups: ["alpha", "beta"] };
test("URL state bounds choices and preserves an explicit empty selection", () => {
  assert.deepEqual(parseViewState("?chart=no&days=999&group=unknown", options), { chart: "share", days: 30, groups: [] });
  assert.deepEqual(parseViewState("", options).groups, ["alpha", "beta"]);
  for (const groups of [[], ["alpha"], ["alpha", "beta"]]) {
    const view = { chart: "balance", days: 7, groups };
    assert.deepEqual(parseViewState(viewQuery(view, options), options), view);
  }
});
test("share links preserve unrelated query state and fragments without appearance preferences", () => {
  const url = new URL(viewURL("https://example.com/?ref=report&group=old#detail", { chart: "share", days: 90, groups: ["beta", "beta"] }, options));
  assert.equal(url.searchParams.get("ref"), "report"); assert.equal(url.hash, "#detail");
  assert.deepEqual(url.searchParams.getAll("group"), ["beta"]);
  assert.equal(url.searchParams.has("theme"), false);
});
test("family identity is stable across filtering and unknown groups remain neutral", () => {
  const original = ["alpha", "beta", "gamma"].map((key) => [key, familyColor(key, "coral")]);
  assert.equal(familyColor("beta", "coral"), new Map(original).get("beta"));
  assert.equal(familyColor("alpha", "unknown"), familyColor("alpha", "neutral"));
  assert.equal(familyColor("alpha", "__proto__"), familyColor("alpha", "neutral"));
});
test("family marks clear graphical contrast in every bundled appearance", () => {
  for (const spec of Object.values(presets)) {
    const tokens = build(spec);
    for (const mode of ["dark", "light"]) for (const colors of Object.values(FAMILY_TONES[mode])) for (const color of colors) {
      assert.ok(contrast(color, tokens[mode].bg) >= 3, `${mode}: ${color}`);
    }
  }
});
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
test("scaffold preserves title text and refuses to overwrite a nonempty target", () => {
  const temp = mkdtempSync(resolve(tmpdir(), "hairline-scaffold-test-"));
  try {
    const target = resolve(temp, "app");
    const script = resolve(root, "skills/hairline-stack/scripts/scaffold.mjs");
    const title = 'A < B & {braces} \\ path';
    const first = spawnSync(process.execPath, [script, "--layout", "analysis", target, "example.com/app", title], { encoding: "utf8" });
    assert.equal(first.status, 0, first.stderr);
    assert.ok(readFileSync(resolve(target, "web/ui/index.html"), "utf8").includes("A &lt; B &amp; &#123;braces&#125; \\ path"));
    assert.ok(existsSync(resolve(target, "web/ui/src/hairline/js/share.js")));
    writeFileSync(resolve(target, "keep.txt"), "keep");
    const again = spawnSync(process.execPath, [script, target, "example.com/app"], { encoding: "utf8" });
    assert.notEqual(again.status, 0); assert.equal(readFileSync(resolve(target, "keep.txt"), "utf8"), "keep");
    const missing = resolve(temp, "missing");
    const absent = spawnSync(process.execPath, [script, "--layout", "analysis", missing, "example.com/app"], { env: { ...process.env, HAIRLINE_CHARTS: resolve(temp, "no-charts") }, encoding: "utf8" });
    assert.notEqual(absent.status, 0); assert.equal(existsSync(missing), false);
  } finally { rmSync(temp, { recursive: true, force: true }); }
});
