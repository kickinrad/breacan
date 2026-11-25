// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// Standard in, standard out: a kit's resolver output loads in Terrazzo's parser and Swatchbook's loader, and a plain
// DTCG folder governed by a resolver, with no theme.toml, builds.
import { expect, test } from "bun:test";
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { defineConfig, parse } from "@terrazzo/parser";
import { defineSwatchbookConfig, loadProject } from "@unpunnyfuns/swatchbook-core";
import { read, root, run, scratch } from "./helpers";

// tokyo-material, built, with its dtcg output.
const built = () => {
  const dir = scratch("standard-kit-");
  cpSync(join(root, "tests/kits/tokyo-material"), dir, { recursive: true });
  expect(run(dir, "build").stderr.toString()).toBe("");
  return dir;
};

test("a kit's resolver output loads in Terrazzo's parser with no errors, the mode its one axis", async () => {
  const file = join(built(), "ports/tokens/tokyo-material.resolver.json");
  const url = pathToFileURL(file);
  const config = defineConfig({}, { cwd: new URL("./", url) });
  const { tokens, resolver } = await parse([{ filename: url, src: readFileSync(file, "utf8") }], { config, req: async (each) => readFileSync(each, "utf8") });
  expect(Object.keys(tokens).length).toBeGreaterThan(300);
  expect(resolver.listPermutations?.()).toEqual([{ mode: "night" }, { mode: "day" }]);
  expect(resolver.apply({ mode: "day" })["md.sys.color.primary"].$value).not.toEqual(tokens["md.sys.color.primary"].$value);
});

test("a kit's resolver output loads in Swatchbook's loader with its axes found", async () => {
  const project = await loadProject(defineSwatchbookConfig({ resolver: "tokyo-material.resolver.json" }), join(built(), "ports/tokens"));
  expect(project.axes.map((axis: { name: string; contexts: string[]; default: string }) => ({ name: axis.name, contexts: axis.contexts, default: axis.default })))
    .toEqual([{ name: "mode", contexts: ["night", "day"], default: "night" }]);
  expect(project.diagnostics.filter((each: { severity: string }) => each.severity === "error")).toEqual([]);
});

test("a plain DTCG folder with a resolver and no theme.toml builds, each mode under its query", () => {
  const kit = built();
  const dir = scratch("standard-plain-");
  cpSync(join(kit, "ports/tokens"), join(dir, "tokens"), { recursive: true });
  writeFileSync(join(dir, "breacan.config.mjs"), 'export default { modules: ["css"], css: { path: "out/tokens.css", scheme: "dark" } };\n');
  const result = run(dir, "build");
  expect(result.stderr.toString()).toBe("");
  const css = read(dir, "out/tokens.css");
  const night = JSON.parse(read(dir, "tokens/tokyo-material.tokens.json")).md.sys.color.primary.$value.hex;
  const day = JSON.parse(read(dir, "tokens/tokyo-material.day.tokens.json")).md.sys.color.primary.$value.hex;
  expect(css).toContain(`--md-sys-color-primary: light-dark(${day}, ${night});`);
});

test("a resolver with a second modifier fails, saying Breacán reads one", () => {
  const dir = scratch("standard-two-");
  mkdirSync(join(dir, "tokens"));
  writeFileSync(join(dir, "tokens/a.tokens.json"), JSON.stringify({ gap: { $type: "dimension", $value: { value: 4, unit: "px" } } }));
  const contexts = { contexts: { one: [], two: [] }, default: "one" };
  writeFileSync(join(dir, "tokens/x.resolver.json"), JSON.stringify({ version: "2025.10", sets: { base: { sources: [{ $ref: "a.tokens.json" }] } },
    modifiers: { mode: contexts, brand: contexts }, resolutionOrder: [{ $ref: "#/sets/base" }, { $ref: "#/modifiers/mode" }, { $ref: "#/modifiers/brand" }] }));
  writeFileSync(join(dir, "breacan.config.mjs"), 'export default { modules: ["css"] };\n');
  const result = run(dir, "build");
  expect(result.exitCode).toBe(1);
  expect(result.stderr.toString()).toContain("Breacán reads one modifier, the mode; this resolver has 2");
});
