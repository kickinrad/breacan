import { expect, test } from "bun:test";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { read, run, scratch } from "./helpers";

const kit = (dial: string) => {
  const dir = join(scratch("material-language-"), "ember");
  expect(run(join(dir, ".."), "new", "--seed", "#d9480f", "--seed", "#2b8a3e", "ember").exitCode).toBe(0);
  const config = join(dir, "breacan.config.mjs");
  writeFileSync(config, readFileSync(config, "utf8").replace('modules: ["leonardo"],',
    `modules: ["leonardo", "react-native"],\n  "react-native": { path: "theme.ts" },\n  platforms: { android: { language: "material", dial: "${dial}" } },`));
  return dir;
};

test("Android at Native takes Material's baseline light colours in light mode and dark in dark mode, Roboto and a 48 touch minimum", async () => {
  const dir = kit("native");
  expect(run(dir, "build").stderr.toString()).toBe("");
  const { themes } = await import(join(dir, "theme.ts"));
  const { light, dark } = themes.android;
  expect(light.tokens.md.sys.color.primary).toBe("#6750a4");
  expect(light.tokens.md.sys.color.surface).toBe("#fef7ff");
  expect(dark.tokens.md.sys.color.primary).toBe("#d0bcff");
  expect(dark.tokens.md.sys.color.surface).toBe("#141218");
  expect(light.textStyles["body-large"].fontFamily).toBe("Roboto");
  expect(light.tokens.breacan.sys["touch-min"]).toBe(48);
  expect(light.tokens.breacan.sys["icon-set"]).toBe("Material Symbols Outlined");
  expect(run(dir, "check").exitCode).toBe(0);
});

test("Android at Branded keeps the theme's colour, type and shape and takes Material's motion and elevation", () => {
  const dir = kit("branded");
  expect(run(dir, "build").stderr.toString()).toBe("");
  const android = JSON.parse(read(dir, "ports/tokens/ember.android.tokens.json"));
  expect(android.md.sys.color?.primary).toBeUndefined();
  expect(android.md.ref?.typeface).toBeUndefined();
  expect(android.md.sys.shape).toBeUndefined();
  expect(android.md.sys.motion.duration.medium3.$value).toEqual({ value: 350, unit: "ms" });
  expect(android.md.sys.elevation.level3.$value).toEqual({ value: 6, unit: "px" });
  expect(run(dir, "check").exitCode).toBe(0);
});
