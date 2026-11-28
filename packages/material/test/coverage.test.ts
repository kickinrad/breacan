// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// The material base against the core's roles: every role gets a value and a mapping row, the rows hold up against
// the vendored tokens, the fill order runs published, then derived, then kept, and a theme sets Material's own
// roles under [platform.material.roles].
import { afterAll, expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ROLES, type BasePart, type Token } from "breacan";
import { contrast } from "breacan/color";
import { cssValue } from "breacan/css";
import { builtins } from "../../core/src/builtins.ts";
import { neutral } from "../../core/src/neutral.ts";
import { apply, compile, loadBases, type Theme } from "../../core/src/theme.ts";
import material, { derivations, materialTokens, rows } from "../src/index.ts";
import { vendored } from "../src/colors.ts";

const core = join(import.meta.dir, "../../core");
const dirs: string[] = [];
afterAll(() => { for (const dir of dirs) rmSync(dir, { recursive: true, force: true }); });

const bases = [...builtins.parts, ...material.parts].filter((part): part is BasePart => part.kind === "base");
const theme = (extra: Partial<Theme> = {}): Theme => ({ file: "theme.toml", name: "m3", base: "material", palette: {}, roles: {}, platform: {}, ...extra });
const resolved = async (mode: string, extra?: Partial<Theme>) => {
  const each = theme(extra);
  const loaded = await loadBases(each, bases, (base) => base.tokens({ options: {}, mode, read: async () => "", log() {}, warn() {} }));
  return new Map(apply(compile(each, loaded))[0].tokens.map((token) => [token.path, token]));
};
const hex = (tokens: Map<string, Token>, path: string) => cssValue(tokens.get(path)!);
const colourRoles = ROLES.filter((role) => role.type === "color" && !role.optional);

test("every core role gets a value and a mapping row, and material publishes most colour roles", async () => {
  for (const mode of ["light", "dark"]) {
    const tokens = await resolved(mode);
    for (const role of ROLES) expect(tokens.get(role.path)?.type, `${role.path} in ${mode}`).toBe(role.type);
  }
  expect(Object.keys(rows).sort()).toEqual(ROLES.map((role) => role.path).sort());
  for (const [role, row] of Object.entries(rows)) {
    expect(["published", "derived", "kept"], role).toContain(row.source);
    expect(row.from, `${role} cites its source`).toBeTruthy();
  }
  // Material has no success, warning or info colours and no third text emphasis, so those seven are derived.
  const share = colourRoles.filter((role) => rows[role.path].source === "published").length / colourRoles.length;
  console.log(`material publishes ${Math.round(share * 100)}% of the ${colourRoles.length} colour roles`);
  expect(share).toBeGreaterThanOrEqual(0.7);
});

test("each row's Material token and cited token exist, and a cited alias names the row's token", () => {
  const at = (path: string) => path.split(".").reduce<any>((node, part) => node?.[part], vendored);
  for (const [role, row] of Object.entries(rows)) {
    if (row.token && !row.token.startsWith("md.sys.typescale.")) expect(at(row.token)?.$value, `${role}'s token ${row.token}`).toBeDefined();
    const cited = row.from!.match(/^md\.[\w.-]+/)?.[0];
    if (!cited || row.source !== "published") continue;
    const { $value } = at(cited) ?? {};
    expect($value, `${role} cites ${cited}`).toBeDefined();
    if (typeof $value === "string" && $value.startsWith("{md.sys.")) expect($value, `${role} cites ${cited}`).toBe(`{${row.token}}`);
  }
  expect(Object.keys(derivations).sort()).toEqual(Object.keys(rows).filter((role) => rows[role].source === "derived").sort());
});

test("a published role takes Material's token, in the light and the dark scheme", async () => {
  const [light, dark] = [await resolved("light"), await resolved("dark")];
  expect(hex(light, "color.surface.default")).toBe(vendored.md.ref.palette.neutral98.$value);
  expect(hex(dark, "color.surface.default")).toBe(vendored.md.ref.palette.neutral6.$value);
  expect(hex(light, "color.scrim")).toBe("rgba(0, 0, 0, 0.32)");
  expect(hex(light, "corner.control")).toBe("8px");
  expect(hex(light, "type.body")).toBe("400 16px/1.5 Roboto, sans-serif");
});

test("a derived role is computed from Material's values, and reads at AA", async () => {
  for (const mode of ["light", "dark"]) {
    const tokens = await resolved(mode);
    const success = hex(tokens, "color.status.success");
    expect(success).not.toBe(cssValue({ type: "color", value: (neutral as any).color.status.success.$value }));
    expect(contrast(hex(tokens, "color.on-status.success"), success), mode).toBeGreaterThanOrEqual(4.5);
    expect(contrast(hex(tokens, "color.text.subtle"), hex(tokens, "color.surface.default")), mode).toBeGreaterThanOrEqual(4.5);
  }
  expect(materialTokens(false).mapping["color.status.success"].source).toBe("derived");
});

test("a kept role is left to neutral, and the mapping says so", async () => {
  const { tokens, mapping } = materialTokens(false);
  expect((tokens as any).font?.mono).toBeUndefined();
  expect(mapping["font.mono"].source).toBe("kept");
  expect(hex(await resolved("light"), "font.mono")).toBe(cssValue({ type: "fontFamily", value: (neutral as any).font.mono.$value }));
});

test("[platform.material.roles] sets a role only Material has, and each table refuses the other's roles", async () => {
  const palette = { paper: "#fbf7f0" };
  const tokens = await resolved("light", { palette, platform: { material: { "md.sys.color.surface-container-high": "paper" } } });
  expect(hex(tokens, "md.sys.color.surface-container-high")).toBe("#fbf7f0");
  expect(hex(await resolved("light"), "md.sys.color.surface-container-high")).toBe(vendored.md.ref.palette.neutral92.$value);
  await expect(resolved("light", { palette, roles: { "md.sys.color.surface-container-high": "paper" } }))
    .rejects.toThrow("it is base material's own, so set it under [platform.material.roles]");
  await expect(resolved("light", { palette, platform: { material: { "color.surface.default": "paper" } } }))
    .rejects.toThrow("color.surface.default is a core role; set it under [roles]");
  await expect(resolved("light", { platform: { apple: { "x.y": 1 } } })).rejects.toThrow("[platform.apple] names a base this theme does not start from");
});

test("a project builds on the material base with breacan build, and check passes", () => {
  const dir = mkdtempSync(join(tmpdir(), "breacan-material-"));
  dirs.push(dir);
  cpSync(join(import.meta.dir, "fixtures/material"), dir, { recursive: true });
  mkdirSync(join(dir, "node_modules/@breacan"), { recursive: true });
  symlinkSync(core, join(dir, "node_modules/breacan"));
  symlinkSync(join(import.meta.dir, ".."), join(dir, "node_modules/@breacan/material"));
  const run = (verb: string) => Bun.spawnSync(["bun", join(core, "bin/breacan.mjs"), verb], { cwd: dir });
  const built = run("build");
  expect(built.stderr.toString()).toBe("");
  const css = readFileSync(join(dir, "src/styles/tokens.css"), "utf8");
  expect(css).toContain("--color-accent-default: #b4441c;");
  expect(css).toContain("--md-sys-color-surface-container-high: #fbf7f0;");
  expect(css).toContain(`--color-surface-raised: ${vendored.md.ref.palette.neutral96.$value};`);
  expect(run("check").exitCode).toBe(0);
});
