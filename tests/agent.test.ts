// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// Acceptance 10 from outside: each DESIGN.md passes Google's design.md lint, a kit's plugin gives an agent its skill,
// rules and lint config, and the rules lint it carries flags a planted breach.
import { expect, test } from "bun:test";
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { read, root, run, scratch } from "./helpers";

const designLint = (file: string) => {
  const result = Bun.spawnSync([join(root, "node_modules/.bin/design.md"), "lint", file], { stderr: "pipe" });
  return JSON.parse(result.stdout.toString()) as { summary: { errors: number; warnings: number } };
};
// A seed kit with its plugin, made by `breacan new` and built.
const seeded = (engine = "leonardo") => {
  const dir = join(scratch("agent-"), "ember");
  expect(run(join(dir, ".."), "new", "--seed", "#d9480f", "--seed", "#2b8a3e", "--engine", engine, "ember").exitCode).toBe(0);
  const config = join(dir, "breacan.config.mjs");
  writeFileSync(config, readFileSync(config, "utf8").replace(`modules: ["${engine}"]`, `modules: ["${engine}", "plugin"]`)
    .replace('playground: { path: "docs/playground" },', 'playground: { path: "docs/playground" },\n  plugin: { path: "plugins/ember" },'));
  expect(run(dir, "build").stderr.toString()).toBe("");
  return dir;
};

test.each(["leonardo", "material"])("a %s seed kit's DESIGN.md, and its plugin's copy, pass design.md lint with no errors or warnings", (engine) => {
  const dir = seeded(engine);
  for (const file of ["DESIGN.md", "plugins/ember/skills/ember/references/DESIGN.md"]) expect(designLint(join(dir, file)).summary, file).toMatchObject({ errors: 0, warnings: 0 });
}, 60_000);

test("a project's own DESIGN.md, off the contract, passes design.md lint", () => {
  const dir = scratch("agent-own-");
  cpSync(join(root, "tests/fixture"), dir, { recursive: true });
  expect(run(dir, "build").exitCode).toBe(0);
  expect(designLint(join(dir, "DESIGN.md")).summary.errors).toBe(0);
}, 60_000);

test("a kit's plugin, installed in a consumer repo, gives the agent its skill, its rules and its lint config", () => {
  const kit = seeded();
  const consumer = scratch("agent-consumer-");
  cpSync(join(kit, "plugins/ember"), join(consumer, ".claude/plugins/ember"), { recursive: true });
  const plugin = join(consumer, ".claude/plugins/ember");
  expect(JSON.parse(read(plugin, ".claude-plugin/plugin.json")).name).toBe("ember");
  expect(read(plugin, "skills/ember/SKILL.md")).toContain("breacan lint --rules references/breacan.rules.json");
  const index = read(plugin, "skills/ember/references/index.md");
  for (const file of ["DESIGN.md", "breacan.rules.json", "components.md"]) expect(index).toContain(`[${file}](${file})`);
  expect(read(plugin, "skills/ember/references/DESIGN.md")).toContain("- Do put `on-primary` only on `primary`.");
  // The lint config the plugin carries flags a planted breach in the consumer's code, and passes clean code.
  mkdirSync(join(consumer, "src"));
  writeFileSync(join(consumer, "src/clean.css"), ".a { background: var(--md-sys-color-primary); color: var(--md-sys-color-on-primary); }\n");
  const rules = join(plugin, "skills/ember/references/breacan.rules.json");
  expect(run(consumer, "lint", "--rules", rules, "src").stdout.toString()).toBe("");
  writeFileSync(join(consumer, "src/breach.css"), ".b { background: var(--md-sys-color-surface); color: var(--md-sys-color-on-primary); }\n");
  const result = run(consumer, "lint", "--rules", rules, "src");
  expect(result.exitCode).toBe(1);
  expect(result.stdout.toString()).toContain("src/breach.css:1: usage: --md-sys-color-on-primary sits on --md-sys-color-surface");
});

const claude = Bun.which("claude");
test.skipIf(!claude)("Claude Code validates the kit's plugin", () => {
  const result = Bun.spawnSync([claude!, "plugin", "validate", join(seeded(), "plugins/ember")], { stderr: "pipe", timeout: 60_000 });
  expect(result.stdout.toString() + result.stderr.toString()).toContain("Validation passed");
}, 90_000);
