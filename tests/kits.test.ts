// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// The real kits, frozen at d0d1c10: each addon's files build to its golden under the old CLI and the new core
// (tests/golden.ts says how). GOLDEN_CLI=old or new runs one. The new core runs the addons it has an output for and
// skips the rest by name; its goldens are the old ones unless tests/kits/golden/new/ holds a kit's moved bytes.
// Boombox's inputs stay in its private repo, so it runs only when BOOMBOX_DESIGN names a checkout of its pre-breacan tag.
import { expect, test } from "bun:test";
import { build, clis, expected, goldenAddons, kits, outputNames, prepare, type Golden } from "./golden";
import { scratch } from "./helpers";

for (const cli of clis()) {
  for (const kit of kits) {
    const dir = kit.source ? scratch(`golden-${cli}-${kit.name}-`) : undefined;
    if (dir) prepare(cli, kit, dir);
    const has = dir && cli === "new" ? await outputNames(dir) : undefined;
    let built: Golden | undefined;
    for (const addon of goldenAddons()) {
      const files = expected(cli, addon, kit.name);
      if (!files) continue;
      const name = `${cli} CLI: ${kit.name} ${addon} builds byte-identical to its golden`;
      if (!dir) test.skip(`${name} (set BOOMBOX_DESIGN to run it)`, () => {});
      else if (has && !has.includes(addon)) test.skip(`${name} (the new core has no "${addon}" output yet)`, () => {});
      else test(name, () => {
        built ??= build(cli, kit, dir);
        expect(Object.fromEntries(Object.keys(files).map((path) => [path, built![addon]?.[path] ?? "missing"]))).toEqual(files);
      }, 60_000);
    }
  }
}
