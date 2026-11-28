// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// The core's roles: the neutral base gives each one a value that reads, a chain must cover them all, a base's
// mapping table must match what it sets, and theme.toml's [platform] tables are checked as [roles] is.
import { afterAll, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineBase, type BasePart } from "../src/addon.ts";
import { builtins } from "../src/builtins.ts";
import { contrast } from "../src/color.mjs";
import { cssValue } from "../src/css.ts";
import { ROLES } from "../src/roles.ts";
import { apply, compile, loadBases, readTheme, type Theme } from "../src/theme.ts";

const dirs: string[] = [];
afterAll(() => { for (const dir of dirs) rmSync(dir, { recursive: true, force: true }); });

const neutral = builtins.parts.filter((part): part is BasePart => part.kind === "base");
const theme = (base = "neutral"): Theme => ({ file: "theme.toml", name: "t", base, palette: {}, roles: {}, platform: {} });
const load = (each: Theme, extra: BasePart[] = []) => loadBases(each, [...neutral, ...extra], (base) => base.tokens({ options: {}, mode: "default", read: async () => "", log() {}, warn() {} }));
const toml = (text: string) => {
  const dir = mkdtempSync(join(tmpdir(), "breacan-roles-"));
  dirs.push(dir);
  writeFileSync(join(dir, "theme.toml"), text);
  return readTheme(dir, "theme.toml");
};

test("neutral gives every core role a value of its type, and its text and on-colours read at AA", async () => {
  const tokens = new Map(apply(compile(theme(), await load(theme())))[0].tokens.map((token) => [token.path, token]));
  for (const role of ROLES) expect(tokens.get(role.path)?.type, role.path).toBe(role.type);
  const hex = (path: string) => cssValue(tokens.get(`color.${path}`)!);
  const pairs = [
    ...["default", "muted", "subtle"].flatMap((text) => ["default", "raised", "overlay", "sunken"].map((surface) => [`text.${text}`, `surface.${surface}`])),
    ["text.inverse", "surface.inverse"], ["on-accent.default", "accent.default"], ["on-accent.muted", "accent.muted"],
    ...["danger", "success", "warning", "info"].map((status) => [`on-status.${status}`, `status.${status}`]),
  ];
  for (const [fg, bg] of pairs) expect(contrast(hex(fg), hex(bg)), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
  expect(contrast(hex("border.default"), hex("surface.default"))).toBeGreaterThanOrEqual(3);
});

test("an optional family follows color.accent.* until something sets it", async () => {
  const each = { ...theme(), palette: { rust: "#b4441c" }, roles: { "color.accent.default": "rust" } };
  const tokens = apply(compile(each, await load(each)))[0].tokens;
  expect(cssValue(tokens.find((token) => token.path === "color.accent-2.default")!)).toBe("#b4441c");
});

test("a chain that leaves a core role unset, or a base that gives one the wrong type, fails naming it", async () => {
  const root = defineBase({ name: "bare", tokens: () => ({ tokens: { color: { $type: "color", focus: { $value: "#000000" } } } }) });
  await expect(load(theme("bare"), [root])).rejects.toThrow("the base chain bare gives no value to color.surface.default, ");
  const wrong = defineBase({ name: "wrong", base: "neutral", tokens: () => ({ tokens: { corner: { control: { $type: "color", $value: "#000000" } } } }) });
  await expect(load(theme("wrong"), [wrong])).rejects.toThrow("base wrong: corner.control is a dimension role, not a color");
});

test("a base's mapping must name core roles, with a source that matches what the base sets", async () => {
  const mapped = (mapping: object) => [defineBase({
    name: "mapped", base: "neutral", tokens: () => ({ tokens: { color: { focus: { $type: "color", $value: "#000000" } } }, mapping: mapping as any }),
  })];
  await expect(load(theme("mapped"), mapped({ "color.focus": { source: "published" }, "font.mono": { source: "kept" } }))).resolves.toHaveLength(2);
  await expect(load(theme("mapped"), mapped({ "color.focus": { source: "kept" } }))).rejects.toThrow("its mapping says color.focus is kept, but the base sets it");
  await expect(load(theme("mapped"), mapped({ "font.mono": { source: "derived" } }))).rejects.toThrow("its mapping says font.mono is derived, but the base does not set it");
  await expect(load(theme("mapped"), mapped({ "color.focuss": { source: "kept" } }))).rejects.toThrow("its mapping names color.focuss, which is not a core role");
  await expect(load(theme("mapped"), mapped({ "color.focus": { source: "own" } }))).rejects.toThrow('gives color.focus the source "own"');
});

test("theme.toml reads [platform.<name>.roles] and refuses any other key there", async () => {
  const read = await toml('[platform.material.roles]\nmd.sys.color.surface-dim = "#101010"\n');
  expect(read.platform).toEqual({ material: { "md.sys.color.surface-dim": "#101010" } });
  await expect(toml('[platform.material]\ndial = "native"\n')).rejects.toThrow('[platform.material] has an unknown key "dial" (expected roles)');
  await expect(toml('[roles]\n"md.sys.x" = 1\n').then((each) => load(each).then((loaded) => compile(each, loaded)))).rejects.toThrow("[roles] md.sys.x is not a role");
});
