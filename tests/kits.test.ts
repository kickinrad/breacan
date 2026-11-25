// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// The real kits, frozen at d0d1c10: each builds byte-identical to its golden manifest (path → sha256), apart from the generated header.
// tests/kits/<kit>/ holds the Tokyo kits' inputs. Boombox's inputs stay in its private repo, so its golden runs only
// when BOOMBOX_DESIGN names a checkout of it. That checkout's config from before it moved to Swatchbook still lists the
// removed `storybook` output, so the test drops it and the golden holds everything else.
import { expect, test } from "bun:test";
import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { root, run, scratch } from "./helpers";

const golden = (kit: string): Record<string, string> => JSON.parse(readFileSync(join(root, "tests/kits", `${kit}.golden.json`), "utf8"));
const sha = (file: string) => createHash("sha256").update(readFileSync(file)).digest("hex");

const expectGolden = (kit: string, source: string, inputs?: string[], edit?: (config: string) => string) => {
  const dir = scratch(`kit-${kit}-`);
  for (const entry of inputs ?? ["."]) if (existsSync(join(source, entry))) cpSync(join(source, entry), join(dir, entry), { recursive: true });
  if (edit) writeFileSync(join(dir, "breacan.config.mjs"), edit(readFileSync(join(dir, "breacan.config.mjs"), "utf8")));
  const result = run(dir, "build");
  expect(result.stderr.toString()).toBe("");
  expect(result.exitCode).toBe(0);
  const built = Object.fromEntries(Object.keys(golden(kit)).map((path) => [path, existsSync(join(dir, path)) ? sha(join(dir, path)) : "missing"]));
  expect(built).toEqual(golden(kit));
};

for (const kit of ["tokyo-mono", "tokyo-material"]) {
  test(`${kit} builds byte-identical to its golden`, () => expectGolden(kit, join(root, "tests/kits", kit)), 60_000);
}

const boombox = process.env.BOOMBOX_DESIGN;
test.skipIf(!boombox)("boombox-design builds byte-identical to its golden", () =>
  expectGolden("boombox-design", boombox!, ["breacan.config.mjs", "VERSION", "design", "tokens", "preview"],
    (config) => config.replace(' "storybook",', "").replace(/^ *storybook:.*\n/m, "")), 60_000);
