import { expect, test } from "bun:test";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { read, run, scratch } from "./helpers";

test("two seed colours build an iOS Tinted kit with Apple foundations through the binary", () => {
  const dir = join(scratch("apple-"), "ember");
  expect(run(join(dir, ".."), "new", "--seed", "#d9480f", "--seed", "#2b8a3e", "ember").exitCode).toBe(0);
  const config = join(dir, "breacan.config.mjs");
  writeFileSync(config, readFileSync(config, "utf8").replace('  preset: "default",',
    '  preset: "default",\n  platforms: { ios: { language: "apple", dial: "tinted" } },'));
  const result = run(dir, "build");
  expect(result.stderr.toString()).toBe("");
  const base = JSON.parse(read(dir, "ports/tokens/ember.tokens.json"));
  const ios = JSON.parse(read(dir, "ports/tokens/ember.ios.tokens.json"));
  expect(ios.md.sys.color?.primary).toBeUndefined();
  expect(base.md.sys.color.primary.$value.hex).toBeTruthy();
  expect(ios.md.ref.typeface.brand.$value[0]).toBe("SF Pro");
  expect(ios.md.sys.typescale["body-large"].size.$value).toEqual({ value: 17, unit: "px" });
  expect(ios.breacan.sys["touch-min"].$value).toEqual({ value: 44, unit: "px" });
  expect(ios.breacan.sys["icon-set"].$value).toBe("SF Symbols");
  expect(ios.md.sys.shape.corner["extra-large"].$value.value).toBe(22);
  expect(ios.breacan.sys.spacing[300].$value.value).toBe(12);
  expect(ios.md.sys.motion.duration.short2.$value.value).toBe(150);
  expect(ios.md.sys.elevation.level1.$value.value).toBe(1);
  expect(ios.md.comp["button-medium"]["container-height"].$value.value).toBe(44);
  expect(ios.md.comp["outlined-text-field"]).toBeTruthy();
  expect(ios.md.comp.switch).toBeTruthy();
  expect(ios.breacan.comp.bar.material.$value).toBe("Liquid Glass");
  expect(ios.breacan.comp["tab-bar"].material.$value).toBe("Liquid Glass");
  expect(ios.breacan.comp.sheet.presentation.$value).toBe("system sheet");
  expect(ios.breacan.comp.bar.tint.$value.hex).toBe(base.md.sys.color.primary.$value.hex);
  expect(run(dir, "check").exitCode).toBe(0);
});
