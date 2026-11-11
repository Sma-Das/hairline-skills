import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skills = ["hairline-ui", "hairline-stack", "hairline-charts", "hairline-motion"];
for (const name of skills) {
  const folder = resolve(root, "skills", name);
  const text = readFileSync(resolve(folder, "SKILL.md"), "utf8");
  const frontmatter = text.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(frontmatter, `${name}: missing frontmatter`);
  assert.match(frontmatter[1], new RegExp(`^name: ${name}$`, "m"));
  assert.match(frontmatter[1], /^description: "[^"\n]+"$/m);
  assert.ok(statSync(resolve(folder, "agents/openai.yaml")).isFile());
}
const motion = name => readFileSync(resolve(root, "skills", name, "assets/js/motion.js"), "utf8");
assert.equal(motion("hairline-ui"), motion("hairline-motion"), "shared motion helpers drifted");

function checkLinks(folder) {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const path = resolve(folder, entry.name);
    if (entry.isDirectory()) checkLinks(path);
    else if (entry.name.endsWith(".md")) {
      const text = readFileSync(path, "utf8");
      for (const match of text.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
        const target = match[1].split("#")[0];
        if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
        assert.ok(statSync(resolve(folder, decodeURIComponent(target))).isFile(), `${path}: broken link ${target}`);
      }
    }
  }
}
checkLinks(root);
console.log("All four skill packages, local Markdown links, and shared motion helpers pass.");
