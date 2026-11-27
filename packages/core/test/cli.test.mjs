// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from "bun:test";

const run = (...args) => Bun.spawnSync(["bun", new URL("../bin/breacan.mjs", import.meta.url).pathname, ...args]);

test("--help prints usage and exits 0", () => {
  const { exitCode, stdout } = run("--help");
  expect(exitCode).toBe(0);
  expect(stdout.toString()).toContain("usage: breacan");
});

test("an unknown command exits 1", () => {
  expect(run("nope").exitCode).toBe(1);
});
