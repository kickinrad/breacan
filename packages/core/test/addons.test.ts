// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// The contract's first real users and its 5c additions: scheme and dtcg, unknown options, ctx.output, ctx.read,
// ctx.log and ctx.warn, and the breacan/color export.
import { afterAll, expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { contrast, srgb } from "../src/color.mjs";
import { text } from "../src/header.mjs";
import oldDtcg from "../../../src/outputs/dtcg.mjs";
import dtcg from "../src/dtcg.ts";
import { apply, compile, loadBases, loadInputs, readTheme } from "../src/theme.ts";
import { builtins } from "../src/builtins.ts";
import scheme from "../src/scheme.ts";
import type { BasePart, InputPart, OutputPart } from "../src/addon.ts";

const core = join(import.meta.dir, "..");
const fixture = join(import.meta.dir, "fixtures/seed");
const dirs: string[] = [];
afterAll(() => { for (const dir of dirs) rmSync(dir, { recursive: true, force: true }); });

// A copy of the seed fixture with the core installed beside it. `config` replaces its breacan.config.ts, and `theme`
// its theme.toml.
const project = (config?: string, theme?: string) => {
  const dir = mkdtempSync(join(tmpdir(), "breacan-addons-"));
  dirs.push(dir);
  cpSync(fixture, dir, { recursive: true });
  mkdirSync(join(dir, "node_modules"));
  symlinkSync(core, join(dir, "node_modules/breacan"));
  if (config !== undefined) writeFileSync(join(dir, "breacan.config.ts"), config);
  if (theme !== undefined) writeFileSync(join(dir, "theme.toml"), theme);
  return dir;
};
const breacan = (dir: string, ...args: string[]) => {
  const { exitCode, stdout, stderr } = Bun.spawnSync(["bun", join(core, "bin/breacan.mjs"), ...args], { cwd: dir });
  return { exitCode, stdout: stdout.toString(), stderr: stderr.toString() };
};
const read = (dir: string, path: string) => readFileSync(join(dir, path), "utf8");
const json = (dir: string, path: string) => JSON.parse(read(dir, path));
const header = `import { defineConfig } from "breacan";\nimport dtcg from "breacan/dtcg";\nimport scheme from "breacan/scheme";\n`;
const configWith = (options: string) => `${header}export default defineConfig({ addons: [scheme, dtcg], options: ${options} });\n`;
// The fixture's own config with its scheme options replaced.
const withScheme = (given: string) => configWith(`{ breacan: { path: "styles/tokens.css" }, scheme: ${given}, dtcg: { path: "tokens-out" } }`);

test("the seed fixture builds CSS and DTCG files through scheme and dtcg, and checks", () => {
  const dir = project();
  const built = breacan(dir, "build");
  expect(built.stderr).toBe("");
  expect(built.stdout.split("\n")).toEqual(["wrote styles/tokens.css", "wrote tokens-out/seed.tokens.json", "wrote tokens-out/seed.resolver.json", ""]);
  const tokens = json(dir, "tokens-out/seed.tokens.json");
  expect(tokens.$description).toBe(text({ name: "seed" }, "dtcg"));
  for (const path of ["surface", "text", "accent", "on-accent"]) {
    expect(tokens.color[path].default).toMatchObject({ $type: "color", $value: { colorSpace: "srgb", hex: expect.stringMatching(/^#[0-9a-f]{6}$/) } });
  }
  expect(tokens.corner.control.$value).toEqual({ value: 6, unit: "px" });
  const resolver = json(dir, "tokens-out/seed.resolver.json");
  expect(resolver).toMatchObject({ name: "seed", version: "2025.10", sets: { base: { sources: [{ $ref: "seed.tokens.json" }] } } });
  expect(breacan(dir, "check")).toMatchObject({ exitCode: 0, stderr: "" });
});

test("a seed makes Material's tonal-spot roles, light or dark, and they read at AA", () => {
  const roles = (dark: boolean) => {
    const dir = project(withScheme(`{ seed: "#3b5bdb", dark: ${dark} }`));
    expect(breacan(dir, "build").stderr).toBe("");
    const { color } = json(dir, "tokens-out/seed.tokens.json");
    return Object.fromEntries(Object.entries<any>(color).filter(([key]) => key !== "$type").map(([key, role]) => [key, role.default.$value.hex]));
  };
  const [light, dark] = [roles(false), roles(true)];
  expect(light.surface).not.toBe(dark.surface);
  for (const each of [light, dark]) {
    expect(contrast(each["on-accent"], each.accent)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(each.text, each.surface)).toBeGreaterThanOrEqual(4.5);
  }
});

test("a Base24 scheme file gives the roles, the palette and the ANSI colours, and the receipt holds the file", () => {
  const dir = project(withScheme('{ file: "schemes/tokyo-mono-night.yaml" }'));
  expect(breacan(dir, "build").stderr).toBe("");
  const tokens = json(dir, "tokens-out/seed.tokens.json");
  const hex = (path: string) => path.split(".").reduce((node, key) => node?.[key], tokens)?.$value?.hex;
  expect(hex("color.surface.default")).toBe("#292929");
  expect(hex("color.text.default")).toBe("#d6d6d6");
  expect(hex("color.accent.default")).toBe("#7aa2f7");
  expect(hex("scheme.ansi.1")).toBe("#f79178");
  expect(hex("scheme.ansi.15")).toBe("#ffffff");
  expect(hex("scheme.palette.base00")).toBe("#292929");
  expect(contrast(hex("color.on-accent.default")!, hex("color.accent.default")!)).toBeGreaterThanOrEqual(4.5);
  expect(breacan(dir, "check").exitCode).toBe(0);
  writeFileSync(join(dir, "schemes/tokyo-mono-night.yaml"), read(dir, "schemes/tokyo-mono-night.yaml").replace("#292929", "#101010"));
  const stale = breacan(dir, "check");
  expect(stale.exitCode).toBe(1);
  expect(stale.stderr).toContain("schemes/tokyo-mono-night.yaml");
});

test("an iTerm2 scheme gives its background, foreground and ANSI colours", () => {
  const dir = project(withScheme('{ file: "schemes/dracula.itermcolors" }'));
  expect(breacan(dir, "build").stderr).toBe("");
  const tokens = json(dir, "tokens-out/seed.tokens.json");
  expect(tokens.color.surface.default.$value.hex).toBe("#282a36");
  expect(tokens.color.text.default.$value.hex).toBe("#f8f8f2");
  expect(tokens.scheme.ansi["1"].$value.hex).toBe("#ff5555");
  expect(tokens.scheme.ansi["4"].$value.hex).toBe("#bd93f9");
  expect(contrast(tokens.color.accent.default.$value.hex, tokens.color.surface.default.$value.hex)).toBeGreaterThanOrEqual(4.5);
});

test("a scheme missing a slot, both seed and file, and neither, fail naming why", () => {
  const dir = project(withScheme('{ file: "schemes/broken.yaml" }'));
  writeFileSync(join(dir, "schemes/broken.yaml"), 'system: "base16"\nvariant: "dark"\npalette:\n  base00: "#000000"\n');
  expect(breacan(dir, "build").stderr).toContain("has no colour for base01");
  expect(breacan(project(withScheme('{ file: "schemes/dracula.itermcolors", seed: "#3b5bdb" }')), "build").stderr).toContain("give one of the options seed and file");
  expect(breacan(project(withScheme("{}")), "build").stderr).toContain("give one of the options seed and file");
  expect(breacan(project(withScheme('{ seed: "blue" }')), "build").stderr).toContain("seed must be a hex");
  expect(breacan(project(withScheme('{ file: "schemes/none.yaml" }')), "build").stderr).toContain("none.yaml");
});

test("dark with a file warns that a file gives its own variant, and the build goes on", () => {
  const dir = project(withScheme('{ file: "schemes/tokyo-mono-night.yaml", dark: true }'));
  const built = breacan(dir, "build");
  expect(built.exitCode).toBe(0);
  expect(built.stderr).toBe("warning: scheme: schemes/tokyo-mono-night.yaml is a dark scheme; the option dark does not apply to a file\n");
});

test("an option no part declares fails naming the addon and listing the known options", () => {
  const typo = breacan(project(configWith('{ scheme: { sed: "#3b5bdb" } }')), "build");
  expect(typo.exitCode).toBe(1);
  expect(typo.stderr).toBe('breacan: scheme: unknown option "sed"; the known options are seed, file, dark\n');
  expect(breacan(project(configWith('{ breacan: { pth: "x.css" } }')), "build").stderr).toBe('breacan: breacan: unknown option "pth"; the known options are path\n');
  const bare = `export default { addons: [{ name: "extra", contract: 1, parts: [] }], options: { extra: { x: 1 } } };\n`;
  expect(breacan(project(bare), "build").stderr).toContain('extra: unknown option "x"; this addon takes no options');
});

test("a misspelled addon name in options fails naming the addons the project has", () => {
  const result = breacan(project(configWith("{ tailwnd: { path: 'x' } }")), "build");
  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain('options names "tailwnd", which is not an addon here (addons: breacan, scheme, dtcg)');
});

// A config with one addon, "extra", whose outputs and base are the given source.
const extra = (parts: string, options = "{}") => `import { contrast, mix } from "breacan/color";\nexport default { addons: [{ name: "extra", contract: 1, parts: [${parts}] }], options: { extra: ${options} } };\n`;
const plain = `name = "plain"\n`;

test("an output reads another output's files through ctx.output, and each output runs once", () => {
  const dir = project(extra(`
    { kind: "output", name: "second", write: async ({ output, warn }) => {
        const [first] = await output("first");
        warn("first wrote " + first.path);
        return [{ path: "out/second.txt", content: first.content.toUpperCase() }];
      } },
    { kind: "output", name: "first", write: ({ log }) => { log("running"); return [{ path: "out/first.txt", content: "hello" }]; } }`), plain);
  const built = breacan(dir, "build");
  expect(built.stderr).toBe("warning: second: first wrote out/first.txt\n");
  expect(built.stdout.split("\n").filter((line) => line.startsWith("first:"))).toEqual(["first: running"]);
  expect(read(dir, "out/second.txt")).toBe("HELLO");
  expect(breacan(dir, "check").exitCode).toBe(0);
});

test("ctx.output hands back the files before the header, and an output of another's file path still checks", () => {
  const dir = project(extra(`
    { kind: "output", name: "sheet", write: () => [{ path: "out/a.css", content: "a{}\\n" }] },
    { kind: "output", name: "copy", write: async ({ output }) => [{ path: "out/b.css", content: (await output("sheet"))[0].content }] }`), plain);
  expect(breacan(dir, "build").stderr).toBe("");
  // The copy got a{} without sheet's header, so its own header is the only one.
  expect(read(dir, "out/b.css").match(/Generated by/g)).toHaveLength(1);
  expect(read(dir, "out/b.css")).toContain("output copy");
  expect(read(dir, "out/a.css")).toContain("output sheet");
  const clash = project(extra(`
    { kind: "output", name: "sheet", write: () => [{ path: "out/a.css", content: "a{}" }] },
    { kind: "output", name: "copy", write: async ({ output }) => (await output("sheet")) }`), plain);
  expect(breacan(clash, "build").stderr).toContain("outputs sheet and copy both write out/a.css");
});

test("ctx.output fails for an output the project lacks, and for outputs that ask for each other", () => {
  const unknown = project(extra(`{ kind: "output", name: "a", write: async ({ output }) => output("nope") }`), plain);
  expect(breacan(unknown, "build").stderr).toContain('output a asks for the output "nope", which this project lacks (outputs: css, a)');
  const cycle = project(extra(`
    { kind: "output", name: "a", write: async ({ output }) => output("b") },
    { kind: "output", name: "b", write: async ({ output }) => output("a") }`), plain);
  expect(breacan(cycle, "build").stderr).toContain("outputs ask for each other: b → a → b");
  const self = project(extra(`{ kind: "output", name: "a", write: async ({ output }) => output("a") }`), plain);
  expect(breacan(self, "build").stderr).toContain("outputs ask for each other: a → a");
});

test("outputs that wait on each other at once fail naming the chain instead of hanging", () => {
  const dir = project(extra(`
    { kind: "output", name: "a", write: async ({ output }) => (await Promise.all([output("b"), output("c")])).flat() },
    { kind: "output", name: "b", write: async ({ output }) => { await Bun.sleep(5); return output("c"); } },
    { kind: "output", name: "c", write: async ({ output }) => { await Bun.sleep(5); return output("b"); } }`), plain);
  const result = breacan(dir, "build");
  expect(result.exitCode).toBe(1);
  expect(result.stderr).toMatch(/outputs ask for each other: (b → c → b|c → b → c)/);
});

test("an output may not write a file that this or another output read", () => {
  const dir = project(extra(`
    { kind: "output", name: "reader", write: async ({ read }) => { await read("data.txt"); return []; } },
    { kind: "output", name: "writer", write: () => [{ path: "data.txt", content: "x" }] }`), plain);
  writeFileSync(join(dir, "data.txt"), "input");
  const result = breacan(dir, "build");
  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain("output writer writes data.txt, which is an input of the build");
  expect(read(dir, "data.txt")).toBe("input");
  const self = project(extra(`{ kind: "output", name: "both", write: async ({ read }) => [{ path: "data.txt", content: await read("data.txt") }] }`), plain);
  writeFileSync(join(self, "data.txt"), "input");
  expect(breacan(self, "build").stderr).toContain("output both writes data.txt, which is an input of the build");
  expect(read(self, "data.txt")).toBe("input");
});

test("an output reads a project file through ctx.read, and the receipt holds it", () => {
  const dir = project(extra(`{ kind: "output", name: "note", write: async ({ read }) => [{ path: "out/note.txt", content: await read("note.txt") }] }`), plain);
  writeFileSync(join(dir, "note.txt"), "one");
  expect(breacan(dir, "build").stderr).toBe("");
  expect(breacan(dir, "check").exitCode).toBe(0);
  writeFileSync(join(dir, "note.txt"), "two");
  const stale = breacan(dir, "check");
  expect(stale.exitCode).toBe(1);
  expect(stale.stderr).toContain("note.txt");
});

test("an addon imports the colour helpers from breacan/color", () => {
  const dir = project(extra(`{ kind: "output", name: "ratio", write: () => [{ path: "out/ratio.txt", content: contrast("#000000", "#ffffff").toFixed(0) + " " + mix("#000000", "#ffffff", 50) }] }`), plain);
  expect(breacan(dir, "build").stderr).toBe("");
  expect(read(dir, "out/ratio.txt")).toBe("21 #808080");
});

// The 0.x dtcg output wrote these files, so the new output must write the same bytes for the same tokens.
test("the dtcg output writes the 0.x output's tokens and resolver files byte for byte", async () => {
  const dir = project();
  const theme = await readTheme(dir, "theme.toml");
  const bases = [...builtins.parts, ...scheme.parts].filter((part): part is BasePart => part.kind === "base");
  const options = { seed: "#3b5bdb", dark: false };
  const [{ tokens }] = apply(compile(theme, await loadBases(theme, bases, (base) => base.tokens({ options: base.name === "scheme" ? options : {}, mode: "default", read: async () => "", log() {}, warn() {} }))));
  const [write] = dtcg.parts as OutputPart[];
  const files = await write.write({ theme: { name: "seed" }, permutations: [{ input: {}, tokens }], options: { path: "tokens-out" }, read: async () => "", log() {}, warn() {}, output: async () => [] });
  // The 0.x output reads tokens as { path, segments, type, raw }: a colour's raw is its hex.
  const old = (oldDtcg as any).run({
    tokens: tokens.map((token) => ({ ...token, raw: token.type === "color" ? token.value.hex : token.value })),
    media: {}, options: { path: "tokens-out" }, name: "seed", version: undefined,
  });
  expect(files).toEqual(await old);
});

test("an input runs before the bases: its palette sits under the theme's own, and its tokens are a set of its own", async () => {
  const order: string[] = [];
  const input: InputPart = { kind: "input", name: "source", load: () => { order.push("input"); return { palette: { found: "#112233", mine: "#000000" }, tokens: { extra: { $type: "number", one: { $value: 1 } } } }; } };
  const base: BasePart = { kind: "base", name: "neutral", tokens: () => { order.push("base"); return { tokens: { color: { $type: "color", accent: { default: { $value: srgb("#ffffff") } } } } }; } };
  const loaded = await loadInputs([input], (each) => each.load({} as never));
  const bases = await loadBases({ file: "theme.toml", name: "t", base: "neutral", palette: { mine: "#445566" }, roles: { "color.accent.default": "found" } }, [base], (each) => each.tokens({} as never));
  expect(order).toEqual(["input", "base"]);
  const document = compile({ file: "theme.toml", name: "t", base: "neutral", palette: { mine: "#445566" }, roles: { "color.accent.default": "found" } }, bases, loaded);
  const tokens = Object.fromEntries(apply(document)[0].tokens.map((token) => [token.path, token]));
  expect(tokens["color.accent.default"]).toMatchObject({ alias: "palette.found", value: { hex: "#112233" } });
  expect(tokens["palette.mine"].value).toMatchObject({ hex: "#445566" });
  expect(tokens["extra.one"].value).toBe(1);
  await expect(loadInputs([{ ...input, name: "theme" }], (each) => each.load({} as never))).rejects.toThrow('an input cannot be named "theme"');
  expect(() => compile({ file: "theme.toml", name: "t", base: "neutral", palette: {}, roles: {} }, bases, [{ name: "neutral", result: { tokens: {} } }])).toThrow('input "neutral" has the name of a base');
});
