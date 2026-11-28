// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// Rebuild frozen kits in scratch copies and rewrite their goldens, one file per addon (tests/kits/golden/, see
// tests/golden.ts), printing each digest that moved so the PR can say why. Usage: bun scripts/golden.mjs --cli old|new
// [kit...]; every kit with a checkout by default (BOOMBOX_DESIGN names Boombox's). `--cli old` rewrites the old CLI's
// goldens. `--cli new` writes tests/kits/golden/new/<addon>.json only where the new core's bytes differ from the old golden.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build, kits, prepare, readGolden, writeGolden, goldenAddons } from "../tests/golden.ts";

const args = process.argv.slice(2);
const at = args.indexOf("--cli");
const cli = args[at + 1];
if (at < 0 || (cli !== "old" && cli !== "new")) { console.error("usage: bun scripts/golden.mjs --cli old|new [kit...]"); process.exit(2); }
const names = args.filter((_, index) => index !== at && index !== at + 1);
const chosen = kits.filter((kit) => names.length ? names.includes(kit.name) : kit.source);
for (const name of names) if (!chosen.some((kit) => kit.name === name)) { console.error(`no kit "${name}", or its checkout is not set`); process.exit(2); }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

for (const kit of chosen) {
  if (!kit.source) { console.error(`${kit.name}: set BOOMBOX_DESIGN to its pre-breacan checkout`); process.exit(2); }
  const dir = mkdtempSync(join(tmpdir(), "golden-"));
  try {
    prepare(cli, kit, dir);
    const built = build(cli, kit, dir);
    let added = 0;
    for (const addon of [...new Set([...Object.keys(built), ...goldenAddons()])]) {
      const files = built[addon];
      const before = readGolden(cli, addon)[kit.name];
      // The new core keeps a kit's section only where it differs from the old golden; the old CLI's is always kept.
      const keep = files && (cli === "old" || !same(files, readGolden("old", addon)[kit.name]));
      if (cli === "new" && !files) continue;
      if (!files && !before) continue;
      writeGolden(cli, addon, kit.name, keep ? files : undefined);
      added += Object.keys(keep ? files : {}).filter((path) => before?.[path] === undefined).length;
      for (const path of Object.keys({ ...before, ...(keep ? files : {}) })) {
        const was = before?.[path], now = keep ? files[path] : undefined;
        if (was !== now && was !== undefined) console.log(`${kit.name} ${addon} ${path}: ${was?.slice(0, 8) ?? "none"} -> ${now?.slice(0, 8) ?? "none"}`);
      }
    }
    if (added) console.log(`${kit.name}: ${added} new golden entries`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
