// SPDX-FileCopyrightText: 2026 Kick In Rad
//
// SPDX-License-Identifier: Apache-2.0

// Acceptance 6 from outside: each check fails correctly, naming what is wrong.
import { expect, test } from "bun:test";
import { appendFileSync, cpSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { read, root, run, scratch } from "./helpers";

const tokyo = () => {
  const dir = scratch("checks-kit-");
  cpSync(join(root, "tests/kits/tokyo-material"), dir, { recursive: true });
  return dir;
};

test("a planted day-mode contrast failure fails breacan check, naming the pair, the ratio and the mode", () => {
  const dir = tokyo();
  expect(run(dir, "build").stderr.toString()).toBe("");
  // Day's outline grey, too light to hold 3:1 on Day's surfaces.
  writeFileSync(join(dir, "design/base.toml"), read(dir, "design/base.toml").replace('subtext0 = "#616161"', 'subtext0 = "#d0d0d0"'));
  const result = run(dir, "check");
  expect(result.exitCode).toBe(1);
  const message = result.stderr.toString();
  expect(message).toMatch(/md\.sys\.color\.outline \(#d0d0d0\) on md\.sys\.color\.\S+ \(#[0-9a-f]{6}\) is \d\.\d\d:1 in the day mode \(prefers-color-scheme: light\), under the 3:1 floor/);
});

test("a hand-edited output fails against the receipt", () => {
  const dir = tokyo();
  run(dir, "build");
  appendFileSync(join(dir, "docs/playground/tokyo-material.css"), "/* mine */\n");
  const result = run(dir, "check");
  expect(result.exitCode).toBe(1);
  expect(result.stderr.toString()).toContain("docs/playground/tokyo-material.css was edited by hand");
});

// A consumer repo with the kit's rules beside its code.
const consumer = (css: string, html = "") => {
  const kit = scratch("checks-rules-kit-");
  writeFileSync(join(kit, "VERSION"), "0.1.0\n");
  writeFileSync(join(kit, "breacan.config.mjs"), 'export default { kit: { name: "plain" }, include: ["builtin:base"], modules: ["rules"] };\n');
  expect(run(kit, "build").stderr.toString()).toBe("");
  const dir = scratch("checks-consumer-");
  cpSync(join(kit, "breacan.rules.json"), join(dir, "breacan.rules.json"));
  mkdirSync(join(dir, "src"));
  writeFileSync(join(dir, "src/app.css"), css);
  if (html) writeFileSync(join(dir, "src/index.html"), html);
  return dir;
};

test("a hard-coded hex in consumer code fails breacan lint", () => {
  const result = run(consumer(".card { color: #3366ff; }\n"), "lint", "src");
  expect(result.exitCode).toBe(1);
  expect(result.stdout.toString()).toContain("src/app.css:1: colour: #3366ff");
});

test("a token used against its usage rule fails the rules check, and one used by its rule passes", () => {
  const good = consumer(".button {\n  background: var(--md-sys-color-primary);\n  color: var(--md-sys-color-on-primary);\n  border: 1px solid var(--md-sys-color-outline-variant);\n}\n");
  expect(run(good, "lint", "src").stdout.toString()).toBe("");
  const bad = consumer(".chip {\n  background: var(--md-sys-color-surface);\n  color: var(--md-sys-color-on-primary);\n}\n.note { color: var(--md-sys-color-outline-variant); }\n.x { gap: var(--breacan-sys-spacing-301); }\n");
  const result = run(bad, "lint", "src");
  expect(result.exitCode).toBe(1);
  const found = result.stdout.toString();
  expect(found).toContain("src/app.css:3: usage: --md-sys-color-on-primary sits on --md-sys-color-surface; its rule allows --md-sys-color-primary");
  expect(found).toContain("src/app.css:5: usage: --md-sys-color-outline-variant is for border*, outline*, column-rule*, text-decoration-color, not color");
  expect(found).toContain("src/app.css:6: theme ref: --breacan-sys-spacing-301 is not one of the kit's variables");
});

test("an emoji standing in for an icon in markup fails the rules check", () => {
  const result = run(consumer(".a { color: var(--md-sys-color-on-surface); }\n", '<button class="circle">🔍</button>\n'), "lint", "src");
  expect(result.stdout.toString()).toContain("src/index.html:1: icon: an emoji stands in for an icon");
});

test("a token an import flagged for review is named by the build, and listed in the rules", () => {
  const kit = scratch("checks-review-");
  writeFileSync(join(kit, "VERSION"), "0.1.0\n");
  mkdirSync(join(kit, "tokens"));
  writeFileSync(join(kit, "tokens/site.tokens.json"), JSON.stringify({ site: { accent: { $type: "color", $value: "#3366ff", $extensions: { "com.kickinrad.breacan": { "needs-review": true } } } } }));
  writeFileSync(join(kit, "breacan.config.mjs"), 'export default { kit: { name: "plain" }, include: ["builtin:base"], modules: ["rules"] };\n');
  const result = run(kit, "build");
  expect(result.stdout.toString()).toContain("1 token needs review (flagged by an import): site.accent");
  expect(JSON.parse(read(kit, "breacan.rules.json")).review).toEqual(["site.accent"]);
});
