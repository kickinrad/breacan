// SPDX-FileCopyrightText: 2026 Kick In Rad
//
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from "bun:test";
import { cpSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { root, run, scratch } from "./helpers";

test("Expo app typechecks a platform and mode selected from the generated theme", async () => {
  const dir = scratch("breacan-expo-");
  cpSync(join(root, "tests/dial/kit-d"), dir, { recursive: true });
  const config = readFileSync(join(dir, "breacan.config.mjs"), "utf8");
  writeFileSync(join(dir, "breacan.config.mjs"), config.replace('modules: ["dtcg"],', 'modules: ["react-native"],')
    .replace('dtcg: { path: "ports/tokens" },', '"react-native": { path: "expo/theme.ts" },')
    .replace('dial: "branded"', 'dial: "native" }, android: { language: apple, dial: "signature"'));
  cpSync(join(root, "tests/expo"), join(dir, "expo"), { recursive: true });
  symlinkSync(join(root, "node_modules"), join(dir, "node_modules"), "dir");
  const build = run(dir, "build");
  expect(build.stderr.toString()).toBe("");
  expect(build.exitCode).toBe(0);
  const { themes } = await import(join(dir, "expo/theme.ts"));
  expect(themes.ios.light.textStyles["body-large"].fontFamily).toBe("SF Pro");
  expect(themes.android.light.textStyles["body-large"].fontFamily).toBe("Inter");
  expect(themes.ios.light.tokens.md.sys.color.primary).toBe("#007aff");
  expect(themes.android.light.tokens.md.sys.color.primary).toBe("#8a2be2");
  expect(themes.ios.dark.tokens.md.sys.color.primary).toBe("#007aff");
  expect(themes.android.dark.tokens.md.sys.color.primary).not.toBe(themes.android.light.tokens.md.sys.color.primary);
  expect(run(dir, "check").exitCode).toBe(0);
  const check = Bun.spawnSync([join(root, "node_modules/.bin/tsc"), "--noEmit", "-p", "expo/tsconfig.json"], { cwd: dir, stderr: "pipe", stdout: "pipe" });
  expect(check.stdout.toString() + check.stderr.toString()).toBe("");
  expect(check.exitCode).toBe(0);
});
