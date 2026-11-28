// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// The tracer: theme.toml through the addon contract, the config loader and the resolver document to a stylesheet
// and a receipt.
import { afterAll, expect, test } from "bun:test";
import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { defineConfig as terrazzoConfig, parse } from "@terrazzo/parser";
import { defineAddon, defineBase, type BasePart } from "../src/addon.ts";
import { builtins } from "../src/builtins.ts";
import { cssValue } from "../src/css.ts";
import { findRoot, loadProject } from "../src/project.ts";
import { apply, compile, loadBases, readTheme, type Theme } from "../src/theme.ts";

const core = join(import.meta.dir, "..");
const fixture = join(import.meta.dir, "fixtures/tracer");
const dirs: string[] = [];
afterAll(() => { for (const dir of dirs) rmSync(dir, { recursive: true, force: true }); });

// A copy of the fixture with the core installed beside it, as a project that ran `bun add breacan` has it.
// `config` replaces its breacan.config.ts.
const project = (config?: string) => {
  const dir = mkdtempSync(join(tmpdir(), "breacan-tracer-"));
  dirs.push(dir);
  cpSync(fixture, dir, { recursive: true });
  mkdirSync(join(dir, "node_modules"));
  symlinkSync(core, join(dir, "node_modules/breacan"));
  if (config !== undefined) writeFileSync(join(dir, "breacan.config.ts"), config);
  return dir;
};
const breacan = (dir: string, ...args: string[]) => {
  const { exitCode, stdout, stderr } = Bun.spawnSync(["bun", join(core, "bin/breacan.mjs"), ...args], { cwd: dir });
  return { exitCode, stdout: stdout.toString(), stderr: stderr.toString() };
};
// A config with one addon, named "extra", holding the given parts' source.
const withAddon = (parts: string) => `export default { addons: [{ name: "extra", contract: 1, parts: [${parts}] }] };\n`;
const writes = (path: string) => `{ kind: "output", name: "out", write: () => [{ path: ${JSON.stringify(path)}, content: "x" }] }`;

const bases = builtins.parts.filter((part): part is BasePart => part.kind === "base");
const tokensOf = (base: BasePart) => base.tokens({ options: {}, mode: "default", read: async () => "", log() {}, warn() {} });
const resolved = async (theme: Theme, extra: BasePart[] = []) => apply(compile(theme, await loadBases(theme, [...bases, ...extra], tokensOf)))[0].tokens;
const value = (tokens: Awaited<ReturnType<typeof resolved>>, path: string) => {
  const token = tokens.find((each) => each.path === path);
  return token && cssValue(token);
};

test("the loader finds the project from a subfolder and gives each part its addon's options", async () => {
  const dir = project();
  mkdirSync(join(dir, "deep/er"), { recursive: true });
  expect(findRoot(join(dir, "deep/er"))).toBe(dir);
  const loaded = await loadProject(join(dir, "deep/er"));
  expect(loaded.configFile).toBe("breacan.config.ts");
  for (const part of builtins.parts) expect(loaded.optionsFor(part)).toEqual({ path: "styles/tokens.css" });
});

test("with no config the project runs the built-ins with their defaults", async () => {
  const dir = project();
  rmSync(join(dir, "breacan.config.ts"));
  const loaded = await loadProject(dir);
  expect(loaded.configFile).toBeUndefined();
  expect(loaded.addons).toEqual([builtins]);
  expect(loaded.optionsFor(builtins.parts[0])).toEqual({ path: "src/styles/tokens.css" });
});

test("a config with an unknown key or a part of an unknown kind fails naming it", async () => {
  // Each case is its own folder: the runtime caches a module by its path.
  await expect(loadProject(project("export default { adons: [] };\n"))).rejects.toThrow('unknown key "adons"');
  await expect(loadProject(project(withAddon('{ kind: "target", name: "y" }')))).rejects.toThrow('a part has kind "target"');
});

test("options are keyed by addon name, checked by type, and a part name belongs to one addon", async () => {
  await expect(loadProject(project('export default { options: { css: { path: "a.css" } } };\n'))).rejects.toThrow('options names "css", which is not an addon here');
  await expect(loadProject(project("export default { options: { breacan: { path: 3 } } };\n"))).rejects.toThrow('breacan: option "path" must be a string');
  await expect(loadProject(project(withAddon('{ kind: "output", name: "x", options: { dir: { type: "string", description: "d", required: true } }, write: () => [] }')))).rejects.toThrow('extra: option "dir" is required');
  // The same name in another kind still clashes: one name is one help line and one place in an error.
  await expect(loadProject(project(withAddon('{ kind: "base", name: "css", tokens: () => ({ tokens: {} }) }')))).rejects.toThrow('extra and breacan both provide a part named "css"');
});

test("an addon for another contract fails by name, and only the owning addon provides a core verb", async () => {
  await expect(loadProject(project('export default { addons: [{ name: "future", contract: 2, parts: [] }] };\n'))).rejects.toThrow("future is written for addon contract 2; this core reads contract 1");
  expect(defineAddon({ name: "x", parts: [] }).contract).toBe(1);
  await expect(loadProject(project(withAddon('{ kind: "command", name: "lint", summary: "s", run() {} }')))).rejects.toThrow('extra: "lint" is a core verb, which only breacan provides');
  await expect(loadProject(project(withAddon('{ kind: "command", name: "studio", summary: "s", run() {} }')))).rejects.toThrow("only @breacan/studio provides");
});

test("an output may not write an input, the receipt or outside the project, and nothing is written when one tries", () => {
  const cases = [
    ["theme.toml", "which is an input of the build"], ["./breacan.config.ts", "which is an input of the build"],
    ["breacan.receipt.json", "which is the receipt"], ["../escape.css", "which is outside the project"], ["/tmp/escape.css", "which is outside the project"],
  ];
  for (const [path, message] of cases) {
    const dir = project(withAddon(writes(path)));
    const result = breacan(dir, "build");
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain(`output out writes ${path}, ${message}`);
    expect(existsSync(join(dir, "src/styles/tokens.css"))).toBe(false);
    expect(existsSync(join(dir, "breacan.receipt.json"))).toBe(false);
  }
});

test("two outputs writing one path fail naming both", () => {
  const result = breacan(project(withAddon(writes("src/styles/tokens.css"))), "build");
  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain("outputs css and out both write src/styles/tokens.css");
});

test("the base fills each role the theme leaves, and a chained base starts from the one it names", async () => {
  const theme = await readTheme(fixture, "theme.toml");
  const tokens = await resolved(theme);
  expect(value(tokens, "color.surface.default")).toBe("#fbf7f0");
  expect(value(tokens, "color.on-accent.default")).toBe("#ffffff");
  expect(value(tokens, "corner.control")).toBe("4px");

  const warm = defineBase({ name: "warm", base: "neutral", tokens: () => ({ tokens: { color: { "on-accent": { default: { $type: "color", $value: "#fff8e7" } } } } }) });
  const chained = await resolved({ ...theme, base: "warm" }, [warm]);
  expect(value(chained, "color.on-accent.default")).toBe("#fff8e7");
  expect(value(chained, "color.text.default")).toBe("#2b2118");
});

test("a role the base lacks, or a value of the wrong type, fails naming the role", async () => {
  const theme = await readTheme(fixture, "theme.toml");
  const loaded = await loadBases(theme, bases, tokensOf);
  expect(() => compile({ ...theme, roles: { "color.surface.defualt": "paper" } }, loaded)).toThrow("color.surface.defualt is not a role");
  expect(() => compile({ ...theme, roles: { "corner.control": "rust" } }, loaded)).toThrow("corner.control is a dimension, not a color");
});

test("the resolver document is one Terrazzo's DTCG 2025.10 parser reads to the same values", async () => {
  const theme = await readTheme(fixture, "theme.toml");
  const document = compile(theme, await loadBases(theme, bases, tokensOf));
  const dir = mkdtempSync(join(tmpdir(), "breacan-resolver-"));
  dirs.push(dir);
  const file = join(dir, "theme.resolver.json");
  writeFileSync(file, JSON.stringify(document));
  const url = pathToFileURL(file);
  const { resolver } = await parse([{ filename: url, src: readFileSync(file, "utf8") }], { config: terrazzoConfig({}, { cwd: new URL("./", url) }) });
  const theirs = resolver.apply(resolver.inputDefault);
  const [{ input, tokens }] = apply(document);
  expect(input).toEqual({});
  expect(Object.keys(theirs).sort()).toEqual(tokens.map((token) => token.path).sort());
  for (const token of tokens) if (token.type === "color") expect(theirs[token.path].$value.components).toEqual(token.value.components);
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
