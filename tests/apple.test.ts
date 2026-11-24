import { expect, test } from "bun:test";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { read, run, scratch } from "./helpers";

const kit = (dial: string) => {
  const dir = join(scratch("apple-"), "ember");
  expect(run(join(dir, ".."), "new", "--seed", "#d9480f", "--seed", "#2b8a3e", "ember").exitCode).toBe(0);
  const config = join(dir, "breacan.config.mjs");
  writeFileSync(config, readFileSync(config, "utf8").replace('modules: ["leonardo"],',
    `modules: ["leonardo", "react-native"],\n  "react-native": { path: "theme.ts" },\n  platforms: { ios: { language: "apple", dial: "${dial}" } },`));
  return dir;
};

test("iOS at Native takes Apple's light surface in light mode and its dark surface in dark mode", async () => {
  const dir = kit("native");
  const result = run(dir, "build");
  expect(result.stderr.toString()).toBe("");
  const { themes } = await import(join(dir, "theme.ts"));
  const { light, dark } = themes.ios;
  expect(light.tokens.md.sys.color.surface).toBe("#ffffff");
  expect(dark.tokens.md.sys.color.surface).toBe("#000000");
  expect(light.tokens.md.sys.color.primary).toBe("#0088ff");
  expect(dark.tokens.md.sys.color.primary).toBe("#0091ff");
  expect(light.textStyles["body-large"].fontFamily).toBe("SF Pro");
  expect(run(dir, "check").exitCode).toBe(0);
});

test("iOS at Tinted keeps the theme's colour, Apple's type, touch minimum, icons and chrome", () => {
  const dir = kit("tinted");
  expect(run(dir, "build").stderr.toString()).toBe("");
  const base = JSON.parse(read(dir, "ports/tokens/ember.tokens.json"));
  const ios = JSON.parse(read(dir, "ports/tokens/ember.ios.tokens.json"));
  expect(ios.md.sys.color?.primary).toBeUndefined();
  expect(ios.md.ref.typeface.brand.$value[0]).toBe("SF Pro");
  expect(ios.md.sys.typescale["body-large"].size.$value).toEqual({ value: 17, unit: "px" });
  expect(ios.breacan.sys["touch-min"].$value).toEqual({ value: 44, unit: "px" });
  expect(ios.breacan.sys["icon-set"].$value).toBe("SF Symbols");
  expect(ios.breacan.comp.bar.material.$value).toBe("Liquid Glass");
  expect(ios.breacan.comp["tab-bar"].material.$value).toBe("Liquid Glass");
  expect(ios.breacan.comp.sheet.presentation.$value).toBe("system sheet");
  expect(ios.breacan.comp.bar.tint.$value.hex).toBe(base.md.sys.color.primary.$value.hex);
  expect(run(dir, "check").exitCode).toBe(0);
});
