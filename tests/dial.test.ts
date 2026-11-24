// The dial for every foundation, from outside the engine: fixture kit D (walkthrough D) built on iOS with the fixture
// Apple language, at each level and with a per-foundation override (acceptance 5). tests/dial/kit-d.golden.json holds
// each level's resolved values, foundation by foundation; `BREACAN_DIAL_GOLDEN=write bun test tests/dial.test.ts`
// rewrites it, and the PR says why it moved.
import { expect, test } from "bun:test";
import { cpSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { read, root, run, scratch } from "./helpers";
import { FOUNDATIONS, LEVELS } from "../src/dial.mjs";

const GOLDEN = join(root, "tests/dial/kit-d.golden.json");
const GROUPS: Record<string, string[]> = { ...FOUNDATIONS, chrome: ["breacan.comp", "breacan.sys.tint"] };
const foundationOf = (path: string) => Object.keys(GROUPS).find((name) => GROUPS[name].some((group) => path === group || path.startsWith(`${group}.`)));

// Kit D built with its dial set to `dial` (a level, or { level, <foundation>: "theme" | "platform" }).
const build = (dial: unknown) => {
  const dir = scratch("dial-");
  cpSync(join(root, "tests/dial/kit-d"), dir, { recursive: true });
  const config = join(dir, "breacan.config.mjs");
  writeFileSync(config, readFileSync(config, "utf8").replace('dial: "branded"', `dial: ${JSON.stringify(dial)}`));
  return { dir, result: run(dir, "build") };
};
// Every token's resolved value on iOS, by path: the base file with the platform's differences over it.
const flatten = (node: Record<string, any>, path: string[] = [], into: Record<string, unknown> = {}) => {
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith("$")) continue;
    if ("$value" in child) into[[...path, key].join(".")] = child.$value;
    else flatten(child, [...path, key], into);
  }
  return into;
};
const resolvedOn = (dial: unknown) => {
  const { dir, result } = build(dial);
  expect(result.stderr.toString(), JSON.stringify(dial)).toBe("");
  expect(run(dir, "check").exitCode, JSON.stringify(dial)).toBe(0);
  const file = (suffix: string) => flatten(JSON.parse(read(dir, `ports/tokens/kit-d${suffix}.tokens.json`)));
  return { ...file(""), ...file(".ios") };
};

test("each level gives its golden values on fixture kit D, every foundation taken or kept as its level says", () => {
  const all = Object.fromEntries(LEVELS.map((level) => [level, resolvedOn(level)]));
  // The paths the dial moves: every foundation token that differs between any two levels.
  const moved = [...new Set(LEVELS.flatMap((level) => Object.keys(all[level])))].filter((path) => foundationOf(path) &&
    LEVELS.some((level) => JSON.stringify(all[level][path]) !== JSON.stringify(all.native[path]))).sort();
  const golden = Object.fromEntries(LEVELS.map((level) => [level, Object.fromEntries(Object.keys(GROUPS).map((name) =>
    [name, Object.fromEntries(moved.filter((path) => foundationOf(path) === name).map((path) => [path, all[level][path] ?? null]))]))]));
  if (process.env.BREACAN_DIAL_GOLDEN === "write") writeFileSync(GOLDEN, `${JSON.stringify(golden, null, 2)}\n`);
  expect(golden).toEqual(JSON.parse(readFileSync(GOLDEN, "utf8")));

  // Every foundation moves somewhere between the levels.
  for (const name of Object.keys(FOUNDATIONS)) expect(Object.keys(golden.native[name]).length, name).toBeGreaterThan(0);
  // Native takes every foundation from the platform and Signature keeps every one; between them, Tinted keeps colour
  // only and Branded keeps colour, type and shape.
  const keeps: Record<string, string[]> = { native: [], tinted: ["colour"], branded: ["colour", "type", "shape"] };
  for (const [level, kept] of Object.entries(keeps)) {
    for (const name of Object.keys(FOUNDATIONS)) {
      expect(golden[level][name], `${level} ${name}`).toEqual(golden[kept.includes(name) ? "signature" : "native"][name]);
    }
  }
  expect(golden.native.colour["md.sys.color.primary"]).toMatchObject({ hex: "#007aff" });
  expect(golden.signature.colour["md.sys.color.primary"]).toMatchObject({ hex: "#8a2be2" });
  expect(golden.native.icons["breacan.sys.icon-set"]).toBe("SF Symbols");
  expect(golden.signature.icons["breacan.sys.icon-set"]).toBe("Phosphor");
  expect(golden.branded.type["md.sys.typescale.body-large.font"]).toEqual(["Inter", "sans-serif"]);
  expect(golden.branded.components["md.comp.button-medium.container-height"]).toEqual({ value: 50, unit: "px" });
  expect(golden.signature.components["md.comp.button-medium.container-height"]).toEqual({ value: 56, unit: "px" });

  // System chrome stays native with the brand's tint below Signature, even at Native, where colour is the platform's.
  for (const level of ["native", "tinted", "branded"]) {
    expect(golden[level].chrome["breacan.comp.bar.container-color"], level).toMatchObject({ hex: "#f9f9f9" });
    expect(golden[level].chrome["breacan.comp.bar.tint"], level).toMatchObject({ hex: "#8a2be2" });
    expect(golden[level].chrome["breacan.comp.control.tint"], level).toMatchObject({ hex: "#8a2be2" });
  }
  expect(Object.values(golden.signature.chrome).every((value) => value === null)).toBe(true);
});

test("one per-foundation override changes only that foundation's tokens", () => {
  const branded = resolvedOn("branded");
  const overridden = resolvedOn({ level: "branded", motion: "theme" });
  const changed = [...new Set([...Object.keys(branded), ...Object.keys(overridden)])]
    .filter((path) => JSON.stringify(branded[path]) !== JSON.stringify(overridden[path]));
  expect(changed.length).toBeGreaterThan(0);
  expect(changed.filter((path) => foundationOf(path) !== "motion")).toEqual([]);
  expect(overridden).toMatchObject({ "md.sys.motion.duration.medium2": resolvedOn("signature")["md.sys.motion.duration.medium2"] });
});

test("a dial the dial does not know fails the build, naming what it takes", () => {
  const level = build("loud").result;
  expect(level.exitCode).toBe(1);
  expect(level.stderr.toString()).toContain("platforms.ios.dial must be one of native, tinted, branded, signature");
  const foundation = build({ level: "branded", sound: "theme" }).result;
  expect(foundation.exitCode).toBe(1);
  expect(foundation.stderr.toString()).toContain("platforms.ios.dial.sound is not a foundation; the foundations are colour, type, shape");
  const side = build({ level: "branded", motion: "brand" }).result;
  expect(side.exitCode).toBe(1);
  expect(side.stderr.toString()).toContain('platforms.ios.dial.motion must be "theme" or "platform", not "brand"');
});
