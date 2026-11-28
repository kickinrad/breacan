// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// An image's palette seeds a colour engine (acceptance 11). tests/image/bands.png is three bands, teal #1b9a8a,
// coral #e86a4f and navy #222f5b, made for this test with a script; it is dedicated to the public domain (CC0).
import { expect, test } from "bun:test";
import { cpSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { read, root, run, scratch } from "./helpers";
import { contrast } from "../packages/core/src/color.mjs";
import { contract } from "../src/contract.mjs";

const kit = (image: object) => {
  const dir = scratch("image-");
  cpSync(join(root, "tests/image"), join(dir, "image"), { recursive: true });
  writeFileSync(join(dir, "VERSION"), "0.1.0\n");
  writeFileSync(join(dir, "breacan.config.mjs"), `export default { preset: "default", kit: { name: "bands" }, modules: ["image"], image: ${JSON.stringify(image)},
  dtcg: { path: "ports/tokens" }, "claude-design": { path: "ports/claude-design" }, playground: { path: "docs/playground" } };\n`);
  return dir;
};
const tokens = (dir: string, mode = "") => JSON.parse(read(dir, `ports/tokens/bands${mode}.tokens.json`));
const rgb = (colour: string) => [1, 3, 5].map((i) => Number.parseInt(colour.slice(i, i + 2), 16));
const distance = (a: string, b: string) => Math.hypot(...rgb(a).map((part, i) => part - rgb(b)[i]));
const hex = (tree: Record<string, any>, path: string) => path.split(".").reduce((node, key) => node?.[key], tree)?.$value?.hex;

test("an image builds a whole kit: its three colours are the palette and seed the roles, every role in both modes", () => {
  const dir = kit({ file: "image/bands.png" });
  const result = run(dir, "build");
  expect(result.stderr.toString()).toBe("");
  const light = tokens(dir);
  // The quantiser and scorer land near each band's colour, not on it.
  const palette = ["1", "2", "3"].map((i) => hex(light, `image.palette.${i}`));
  for (const band of ["#1b9a8a", "#222f5b", "#e86a4f"]) expect(Math.min(...palette.map((seed) => distance(seed, band))), band).toBeLessThan(40);
  for (const role of contract().filter((path) => path.startsWith("md.sys.color.")).map((path) => path.split(".").at(-1)!)) {
    expect(hex(light, `md.sys.color.${role}`), role).toMatch(/^#[0-9a-f]{6}$/);
  }
  // The first palette colour seeds the primary, which Leonardo holds at 5.5:1 on the surface.
  expect(contrast(hex(light, "md.sys.color.primary"), hex(light, "md.sys.color.surface"))).toBeGreaterThan(5.4);
  expect(run(dir, "check").exitCode).toBe(0);
});

test("the Material engine takes the image's colours too", () => {
  const dir = kit({ file: "image/bands.png", engine: "material" });
  expect(run(dir, "build").stderr.toString()).toBe("");
  expect(hex(tokens(dir), "md.sys.color.primary")).toMatch(/^#[0-9a-f]{6}$/);
});

test("a missing file, a file that is no image fail, naming the file; an unknown engine fails naming the option", () => {
  expect(run(kit({ file: "image/nope.png" }), "build").stderr.toString()).toContain("image: cannot read image/nope.png");
  const dir = kit({ file: "image/not.png" });
  writeFileSync(join(dir, "image/not.png"), "not an image");
  expect(run(dir, "build").stderr.toString()).toContain("image: cannot read image/not.png");
  expect(run(kit({ file: "image/bands.png", engine: "paint" }), "build").stderr.toString()).toContain('option "engine" must be leonardo or material');
});
