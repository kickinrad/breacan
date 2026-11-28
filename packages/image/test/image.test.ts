// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// An image's palette is the starting point. test/bands.png is three bands, teal #1b9a8a, coral #e86a4f and navy
// #222f5b, made for this test with a script; it is dedicated to the public domain (CC0).
import { afterAll, expect, test } from "bun:test";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const here = import.meta.dir;
const dirs: string[] = [];
afterAll(() => { for (const dir of dirs) rmSync(dir, { recursive: true, force: true }); });

// A project that builds its accent from the image's first colour; `options` is the image option block.
const project = (options: string) => {
  const dir = mkdtempSync(join(tmpdir(), "breacan-image-"));
  dirs.push(dir);
  mkdirSync(join(dir, "node_modules/@breacan"), { recursive: true });
  symlinkSync(join(here, "../../core"), join(dir, "node_modules/breacan"));
  symlinkSync(join(here, ".."), join(dir, "node_modules/@breacan/image"));
  copyFileSync(join(here, "bands.png"), join(dir, "bands.png"));
  writeFileSync(join(dir, "theme.toml"), 'name = "bands"\n\n[roles]\n"color.accent.default" = "image-1"\n"color.surface.default" = "image-2"\n');
  writeFileSync(join(dir, "breacan.config.ts"), `import { defineConfig } from "breacan";\nimport image from "@breacan/image";\nexport default defineConfig({ addons: [image], options: { breacan: { path: "tokens.css" }, "@breacan/image": ${options} } });\n`);
  return dir;
};
const breacan = (dir: string, ...args: string[]) => {
  const { exitCode, stdout, stderr } = Bun.spawnSync(["bun", join(here, "../../core/bin/breacan.mjs"), ...args], { cwd: dir });
  return { exitCode, stdout: stdout.toString(), stderr: stderr.toString() };
};
const rgb = (colour: string) => [1, 3, 5].map((i) => Number.parseInt(colour.slice(i, i + 2), 16));
const distance = (a: string, b: string) => Math.hypot(...rgb(a).map((part, i) => part - rgb(b)[i]));

test("an image builds: its colours reach the accent and surface roles, near each band, and the build checks", () => {
  const dir = project('{ file: "bands.png" }');
  const built = breacan(dir, "build");
  expect(built.stderr).toBe("");
  const css = readFileSync(join(dir, "tokens.css"), "utf8");
  const accents = ["accent", "surface"].map((role) => css.match(new RegExp(`--color-${role}-default: (#[0-9a-f]{6});`))?.[1]!);
  for (const accent of accents) expect(Math.min(...["#1b9a8a", "#222f5b", "#e86a4f"].map((band) => distance(accent, band))), accent).toBeLessThan(40);
  expect(breacan(dir, "check")).toMatchObject({ exitCode: 0, stderr: "" });
});

test("the receipt holds the image: a changed file fails the check, naming it", () => {
  const dir = project('{ file: "bands.png" }');
  expect(breacan(dir, "build").stderr).toBe("");
  writeFileSync(join(dir, "bands.png"), readFileSync(join(dir, "bands.png")).subarray(0, -8));
  expect(breacan(dir, "check").stderr).toContain("bands.png");
});

test("a missing file or a file that is no image fails, naming the file", () => {
  expect(breacan(project('{ file: "nope.png" }'), "build").stderr).toContain("cannot read nope.png");
  const dir = project('{ file: "not.png" }');
  writeFileSync(join(dir, "not.png"), "not an image");
  expect(breacan(dir, "build").stderr).toContain("image: cannot read not.png");
});

test("a missing file option fails naming the option; a misspelt one lists the known options", () => {
  expect(breacan(project("{}"), "build").stderr).toContain('option "file" is required');
  expect(breacan(project('{ files: "bands.png" }'), "build").stderr).toContain("the known options are file");
});
