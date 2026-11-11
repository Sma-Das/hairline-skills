#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
let layout = "dashboard";
if (args[0] === "--layout") { args.shift(); layout = args.shift(); }
const [directory, module, title = directory ? basename(directory) : ""] = args;
function fail(message) { console.error(message); process.exit(1); }
if (!directory || !module || args.length > 3 || !["dashboard", "analysis"].includes(layout)) fail("usage: scaffold.sh [--layout dashboard|analysis] <dir> <go-module> [title]");
if (!/^[A-Za-z0-9._~/-]+$/.test(module)) fail("module path has characters Go does not allow");
const target = resolve(directory);
if (existsSync(target) && readdirSync(target).length) fail("refusing to write into a non-empty directory");
const ui = process.env.HAIRLINE_UI || resolve(here, "../hairline-ui");
const charts = process.env.HAIRLINE_CHARTS || resolve(here, "../hairline-charts");
if (!existsSync(resolve(ui, "assets/hairline.css"))) fail("Install hairline-ui alongside this skill, or set HAIRLINE_UI.");
if (layout === "analysis" && !existsSync(resolve(charts, "assets/js/share.js"))) fail("The analysis layout needs hairline-charts alongside this skill, or HAIRLINE_CHARTS.");
mkdirSync(target, { recursive: true });
cpSync(resolve(here, "templates"), target, { recursive: true });
if (layout === "analysis") cpSync(resolve(here, "layouts/analysis"), target, { recursive: true });
renameSync(resolve(target, "gitignore"), resolve(target, ".gitignore"));
renameSync(resolve(target, "dockerignore"), resolve(target, ".dockerignore"));
const name = basename(target).toLowerCase().replace(/[^a-z0-9-]/g, "-");
const escapedTitle = title.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("{", "&#123;").replaceAll("}", "&#125;");
function fill(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) fill(path);
    else if ([".go", ".mod", ".json", ".html", ".svelte", ".js"].includes(extname(path))) {
      const value = [".html", ".svelte"].includes(extname(path)) ? escapedTitle : title;
      const text = readFileSync(path, "utf8").replaceAll("__MODULE__", module).replaceAll("__NAME__", name).replaceAll("__TITLE__", value);
      writeFileSync(path, text);
    }
  }
}
fill(target);
const assets = resolve(target, "web/ui/src/hairline");
mkdirSync(resolve(assets, "js"), { recursive: true });
for (const file of readdirSync(resolve(ui, "assets"))) if (file.endsWith(".css") || ["dm-sans.woff2", "FONT-LICENSE.txt"].includes(file)) cpSync(resolve(ui, "assets", file), resolve(assets, file));
for (const file of readdirSync(resolve(ui, "assets/js"))) if (file.endsWith(".js")) cpSync(resolve(ui, "assets/js", file), resolve(assets, "js", file));
if (layout === "analysis") {
  cpSync(resolve(charts, "assets/charts.css"), resolve(assets, "charts.css"));
  for (const file of readdirSync(resolve(charts, "assets/js"))) if (file.endsWith(".js")) cpSync(resolve(charts, "assets/js", file), resolve(assets, "js", file));
}
console.log(`Scaffolded ${target} (${module}, ${layout}).\nNext:\n  cd ${target}/web/ui && npm install && npm test && npm run build\n  cd ${target} && go test ./... && go run ./cmd/sample`);
