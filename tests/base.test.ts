// The role contract and the Breacán-neutral base: a kit that sets nothing builds whole, every role in every mode.
import { expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { read, run, scratch } from "./helpers";
import { contrast } from "../src/color.mjs";
import { checkContract, contract } from "../src/contract.mjs";

const plain = (extra = "") => {
  const dir = scratch("base-");
  writeFileSync(join(dir, "VERSION"), "0.1.0\n");
  writeFileSync(join(dir, "breacan.config.mjs"), `export default { kit: { name: "plain" }, include: ["builtin:base"], modules: ["css", "beer", "dtcg"],
  css: { path: "out/plain.css", scheme: "light" }, beer: { path: "out/plain-beer.css" }, dtcg: { path: "out/tokens" }${extra} };\n`);
  return dir;
};
const tokensOf = (dir: string, file: string) => JSON.parse(read(dir, `out/tokens/${file}`));
const hex = (tree: Record<string, any>, path: string) => path.split(".").reduce((node, key) => node?.[key], tree)?.$value?.hex;

test("a web kit with nothing but the base builds, light with dark under its query", () => {
  const dir = plain();
  const result = run(dir, "build");
  expect(result.stderr.toString()).toBe("");
  const resolver = tokensOf(dir, "plain.resolver.json");
  expect(resolver.modifiers.mode.default).toBe("light");
  expect(resolver.modifiers.mode.$extensions["com.kickinrad.breacan"].media).toEqual({ dark: "(prefers-color-scheme: dark)" });
  const css = read(dir, "out/plain.css");
  expect(css).toMatch(/--md-sys-color-primary: light-dark\(#0d74ce, #70b8ff\);/);
  expect(css).toContain("--breacan-sys-touch-min: 48px;");
  expect(css).toContain("--breacan-sys-spacing-300: 16px;");
  expect(run(dir, "check").exitCode).toBe(0);
});

test("every contract role has a value in both modes, and each on-role reads on its role at 4.5:1", () => {
  const dir = plain();
  expect(run(dir, "build").exitCode).toBe(0);
  const light = tokensOf(dir, "plain.tokens.json");
  const dark = tokensOf(dir, "plain.dark.tokens.json");
  const roles = contract().filter((role) => role.startsWith("md.sys.color."));
  for (const role of roles) expect(hex(light, role), role).toMatch(/^#[0-9a-f]{6}$/);
  const pairs = [["on-surface", "surface"], ["on-surface-variant", "surface"], ["on-surface", "surface-container-highest"],
    ...["primary", "secondary", "tertiary", "error"].flatMap((role) => [[`on-${role}`, role], [`on-${role}-container`, `${role}-container`], [role, "surface"]])];
  for (const tree of [light, dark]) {
    const value = (role: string) => hex(tree, `md.sys.color.${role}`) ?? hex(light, `md.sys.color.${role}`);
    for (const [fg, bg] of pairs) expect(contrast(value(fg), value(bg)), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    expect(contrast(value("outline"), value("surface")), "outline on surface").toBeGreaterThanOrEqual(3);
  }
});

test("the base check names a role a mode lacks", () => {
  const roles = contract().map((path) => ({ path }));
  expect(() => checkContract({ light: roles, dark: roles })).not.toThrow();
  expect(() => checkContract({ light: roles, dark: roles.filter((role) => role.path !== "breacan.sys.touch-min") }))
    .toThrow("breacan.sys.touch-min (dark)");
});

test("a kit's own tokens override the base", () => {
  const dir = plain();
  mkdirSync(join(dir, "tokens"));
  writeFileSync(join(dir, "tokens/own.tokens.json"), JSON.stringify({ breacan: { sys: { "touch-min": { $type: "dimension", $value: { value: 44, unit: "px" } } } } }));
  expect(run(dir, "build").stderr.toString()).toBe("");
  expect(read(dir, "out/plain.css")).toContain("--breacan-sys-touch-min: 44px;");
});
