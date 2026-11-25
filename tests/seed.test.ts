// SPDX-FileCopyrightText: 2026 Kick In Rad
//
// SPDX-License-Identifier: Apache-2.0

// Walkthrough A: two seed colours make a whole kit. The colour engines meet their own standards.
import { expect, test } from "bun:test";
import { join } from "node:path";
import { Hct, SchemeTonalSpot, argbFromHex, hexFromArgb } from "@material/material-color-utilities";
import { read, run, scratch } from "./helpers";
import { contrast } from "../src/color.mjs";
import { contract } from "../src/contract.mjs";
import { TARGETS } from "../src/foundations/leonardo.mjs";

const SEEDS = ["#d9480f", "#2b8a3e"];
const kit = (engine?: string, seeds = SEEDS) => {
  const dir = join(scratch("seed-"), "ember");
  const result = run(join(dir, ".."), "new", ...seeds.flatMap((seed) => ["--seed", seed]), ...(engine ? ["--engine", engine] : []), "ember");
  expect(result.stderr.toString()).toBe("");
  return dir;
};
const tokens = (dir: string, mode = "") => JSON.parse(read(dir, `ports/tokens/ember${mode}.tokens.json`));
const hex = (tree: Record<string, any>, role: string) => tree.md.sys.color[role]?.$value?.hex;

test("breacan new --seed --seed makes a kit that builds whole: every role in both modes, and every default output", () => {
  const dir = kit();
  const result = run(dir, "build");
  expect(result.stderr.toString()).toBe("");
  for (const file of ["src/styles/tokens.css", "src/styles/beer.css", "DESIGN.md", "ports/tokens/ember.resolver.json", "ports/claude-design/project/README.md", "docs/playground/index.html"]) {
    expect(read(dir, file).length, file).toBeGreaterThan(0);
  }
  const light = tokens(dir);
  for (const role of contract().filter((path) => path.startsWith("md.sys.color.")).map((path) => path.split(".").at(-1)!)) expect(hex(light, role), role).toMatch(/^#[0-9a-f]{6}$/);
  expect(run(dir, "check").exitCode).toBe(0);
});

test("the Leonardo engine's roles meet every contrast target against the scheme's surface", () => {
  const dir = kit();
  expect(run(dir, "build").exitCode).toBe(0);
  const schemes = { light: tokens(dir), dark: { md: { sys: { color: { ...tokens(dir).md.sys.color, ...tokens(dir, ".dark").md.sys.color } } } } };
  for (const [scheme, tree] of Object.entries(schemes) as [keyof typeof TARGETS, Record<string, any>][]) {
    const surface = hex(tree, "surface");
    for (const role of ["primary", "secondary"]) {
      const ratio = (each: string) => contrast(hex(tree, each), surface);
      // Leonardo lands each colour within a hair of its target.
      expect(ratio(role), `${role} ${scheme}`).toBeGreaterThanOrEqual(TARGETS[scheme].role - 0.05);
      expect(ratio(`on-${role}-container`), `on-${role}-container ${scheme}`).toBeGreaterThanOrEqual(TARGETS[scheme]["on-container"] - 0.1);
      expect(contrast(hex(tree, `on-${role}`), hex(tree, role)), `on-${role} ${scheme}`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(hex(tree, `on-${role}-container`), hex(tree, `${role}-container`)), `on-${role}-container on its container ${scheme}`).toBeGreaterThanOrEqual(4.5);
    }
  }
});

test("for a fixed seed, the Material engine's roles equal material-color-utilities' own tonal-spot scheme", () => {
  const dir = kit("material", ["#6750a4"]);
  expect(run(dir, "build").stderr.toString()).toBe("");
  const light = tokens(dir);
  const dark = { ...light.md.sys.color, ...tokens(dir, ".dark").md.sys.color };
  for (const [tree, isDark] of [[light.md.sys.color, false], [dark, true]] as const) {
    const scheme = new SchemeTonalSpot(Hct.fromInt(argbFromHex("#6750a4")), isDark, 0) as unknown as Record<string, number>;
    for (const role of Object.keys(light.md.sys.color)) {
      const camel = role.replace(/-(\w)/g, (_, letter: string) => letter.toUpperCase());
      expect(tree[role].$value.hex, `${role} ${isDark ? "dark" : "light"}`).toBe(hexFromArgb(scheme[camel]));
    }
  }
});

test("new refuses a bad seed and an existing kit", () => {
  const dir = scratch("seed-bad-");
  expect(run(dir, "new", "--seed", "orange").stderr.toString()).toContain("must list one to three colours");
  expect(run(dir, "new", "--seed", "#123456").exitCode).toBe(0);
  expect(run(dir, "new", "--seed", "#123456").stderr.toString()).toContain("already holds a kit");
});
