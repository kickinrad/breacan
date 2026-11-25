// SPDX-FileCopyrightText: 2026 Kick In Rad
//
// SPDX-License-Identifier: Apache-2.0

// What every CLI test shares: the repo root, the binary (BREACAN_BIN, or the source under Bun), run/read, and scratch
// directories that are removed when the test run ends.
import { afterAll } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

export const root = resolve(import.meta.dir, "..");
export const command = process.env.BREACAN_BIN ? [resolve(process.env.BREACAN_BIN)] : ["bun", join(root, "bin/breacan.mjs")];
export const run = (cwd: string, ...args: string[]) => Bun.spawnSync([...command, ...args], { cwd, stderr: "pipe" });
export const read = (dir: string, file: string) => readFileSync(join(dir, file), "utf8");
const scratches: string[] = [];
// bunfig.toml preloads this file, so the hook is global and runs once, after every test file.
afterAll(() => { for (const dir of scratches) rmSync(dir, { recursive: true, force: true }); });
export const scratch = (prefix: string) => {
  if (/[\\/]/.test(prefix)) throw new Error(`scratch: a prefix names a directory in the temp folder, not a path: ${prefix}`);
  const dir = mkdtempSync(join(tmpdir(), prefix));
  scratches.push(dir);
  return dir;
};
