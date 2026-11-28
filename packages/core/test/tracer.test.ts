// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// The tracer: theme.toml through the addon contract, the config loader and the resolver document to a stylesheet
// and a receipt.
import { afterAll, expect, test } from "bun:test";
import { appendFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { defineConfig as terrazzoConfig, parse } from "@terrazzo/parser";
import { defineAddon } from "../src/addon.ts";
import { builtins } from "../src/builtins.ts";
import { findRoot, loadProject } from "../src/project.ts";
import { apply, compile, readTheme } from "../src/theme.ts";

const core = join(import.meta.dir, "..");
const fixture = join(import.meta.dir, "fixtures/tracer");
const dirs: string[] = [];
afterAll(() => { for (const dir of dirs) rmSync(dir, { recursive: true, force: true }); });

// A copy of the fixture with the core installed beside it, as a project that ran `bun add breacan` has it.
const project = () => {
  const dir = mkdtempSync(join(tmpdir(), "breacan-tracer-"));
  dirs.push(dir);
  cpSync(fixture, dir, { recursive: true });
  mkdirSync(join(dir, "node_modules"));
  symlinkSync(core, join(dir, "node_modules/breacan"));
  return dir;
};
const breacan = (dir: string, ...args: string[]) => {
  const { exitCode, stdout, stderr } = Bun.spawnSync(["bun", join(core, "bin/breacan.mjs"), ...args], { cwd: dir });
  return { exitCode, stdout: stdout.toString(), stderr: stderr.toString() };
};
const value = (tokens: { path: string; css: unknown }[], path: string) => tokens.find((token) => token.path === path)?.css;

test("the loader finds the project from a subfolder and reads its config's options", async () => {
  const dir = project();
  mkdirSync(join(dir, "deep/er"), { recursive: true });
  expect(findRoot(join(dir, "deep/er"))).toBe(dir);
  const loaded = await loadProject(join(dir, "deep/er"));
  expect(loaded.configFile).toBe("breacan.config.ts");
  const css = builtins.parts.find((part) => part.kind === "output")!;
  expect(loaded.optionsFor(css)).toEqual({ path: "styles/tokens.css" });
});

test("with no config the project runs the built-ins with their defaults", async () => {
  const dir = project();
  rmSync(join(dir, "breacan.config.ts"));
  const loaded = await loadProject(dir);
  expect(loaded.configFile).toBeUndefined();
  expect(loaded.addons).toEqual([builtins]);
  expect(loaded.optionsFor(builtins.parts.find((part) => part.kind === "output")!)).toEqual({ path: "src/styles/tokens.css" });
});

test("a config with an unknown key or a part of an unknown kind fails naming it", async () => {
  // Each case is its own folder: the runtime caches a module by its path.
  const [one, two] = [project(), project()];
  writeFileSync(join(one, "breacan.config.ts"), 'export default { adons: [] };\n');
  await expect(loadProject(one)).rejects.toThrow('unknown key "adons"');
  writeFileSync(join(two, "breacan.config.ts"), 'export default { addons: [{ name: "x", parts: [{ kind: "target", name: "y" }] }] };\n');
  await expect(loadProject(two)).rejects.toThrow('a part has kind "target"');
});

test("the base fills each role the theme leaves, and a chained base starts from the one it names", async () => {
  const theme = await readTheme(fixture, "theme.toml");
  const optionsFor = () => ({});
  const bases = builtins.parts.filter((part) => part.kind === "base");
  const tokens = apply(compile(theme, bases, optionsFor));
  expect(value(tokens, "color.surface.default")).toBe("#fbf7f0");
  expect(value(tokens, "color.on-accent.default")).toBe("#ffffff");
  expect(value(tokens, "corner.control")).toBe("4px");

  const warm = defineAddon({ name: "warm", parts: [{ kind: "base", name: "warm", base: "neutral", tokens: () => ({ color: { "on-accent": { default: { $type: "color", $value: "#fff8e7" } } } }) }] });
  const chained = apply(compile({ ...theme, base: "warm" }, [...bases, ...warm.parts.filter((part) => part.kind === "base")], optionsFor));
  expect(value(chained, "color.on-accent.default")).toBe("#fff8e7");
  expect(value(chained, "color.text.default")).toBe("#2b2118");
});

test("a role the base lacks, or a value of the wrong type, fails naming the role", async () => {
  const theme = await readTheme(fixture, "theme.toml");
  const bases = builtins.parts.filter((part) => part.kind === "base");
  expect(() => compile({ ...theme, roles: { "color.surface.defualt": "paper" } }, bases, () => ({}))).toThrow("color.surface.defualt is not a role");
  expect(() => compile({ ...theme, roles: { "corner.control": "rust" } }, bases, () => ({}))).toThrow("corner.control is a dimension, not a color");
});

test("the resolver document is one Terrazzo's DTCG 2025.10 parser reads to the same values", async () => {
  const theme = await readTheme(fixture, "theme.toml");
  const document = compile(theme, builtins.parts.filter((part) => part.kind === "base"), () => ({}));
  const dir = mkdtempSync(join(tmpdir(), "breacan-resolver-"));
  dirs.push(dir);
  const file = join(dir, "theme.resolver.json");
  writeFileSync(file, JSON.stringify(document));
  const url = pathToFileURL(file);
  const { resolver } = await parse([{ filename: url, src: readFileSync(file, "utf8") }], { config: terrazzoConfig({}, { cwd: new URL("./", url) }) });
  const theirs = resolver.apply(resolver.inputDefault);
  const ours = apply(document);
  expect(Object.keys(theirs).sort()).toEqual(ours.map((token) => token.path).sort());
  for (const token of ours.filter((each) => each.type === "color")) expect(theirs[token.path].$value.components).toEqual((token.raw as { components: number[] }).components);
});

test("build writes the stylesheet and receipt; check passes, then fails on a hand edit", () => {
  const dir = project();
  const built = breacan(dir, "build");
  expect(built.stderr).toBe("");
  expect(built.stdout).toBe("wrote styles/tokens.css\n");
  const css = readFileSync(join(dir, "styles/tokens.css"), "utf8");
  expect(css).toContain("Generated by Breacán from tracer, output css: do not edit");
  expect(css).toContain("--color-accent-default: #b4441c;");
  expect(css).toContain("--corner-control: 4px;");
  const receipt = JSON.parse(readFileSync(join(dir, "breacan.receipt.json"), "utf8"));
  expect(receipt.inputs.map((entry: { path: string }) => entry.path)).toEqual(["breacan.config.ts", "theme.toml"]);
  expect(breacan(dir, "check").exitCode).toBe(0);

  appendFileSync(join(dir, "styles/tokens.css"), "/* tweak */\n");
  const checked = breacan(dir, "check");
  expect(checked.exitCode).toBe(1);
  expect(checked.stderr).toContain("styles/tokens.css was edited by hand");
});
