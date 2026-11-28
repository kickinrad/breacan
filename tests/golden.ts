// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// The golden harness: build a frozen kit with the old CLI or the new core and hold each addon's files to its golden.
// tests/kits/golden/<addon>.json maps kit → path → sha256 as the old CLI builds them (frozen at d0d1c10, plus the
// header rename in 09d8393). tests/kits/golden/new/<addon>.json holds a kit's files where the new core's bytes differ,
// and the PR that adds one says why; a kit with none there must match the old golden byte for byte. Used by
// tests/kits.test.ts and scripts/golden.mjs, so it imports nothing from bun:test.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative, resolve, sep } from "node:path";
import { loadProject, partsOf } from "../packages/core/src/project.ts";
import { migrateTheme } from "./migrate-theme.ts";

export const root = resolve(import.meta.dir, "..");
export type Cli = "old" | "new";
/** kit → path → sha256. */
export type Golden = Record<string, Record<string, string>>;
export interface Kit {
  name: string;
  /** The kit's checkout; undefined when its env var is unset. */
  source: string | undefined;
  /** Top-level entries of the checkout to copy; all of it when unset. */
  inputs?: string[];
  /** Where the new core's css output goes, when the checkout has no breacan.config.ts of its own. */
  css?: string;
}

// Boombox's inputs stay in its private repo: BOOMBOX_DESIGN names a checkout of its `pre-breacan` tag.
export const kits: Kit[] = [
  { name: "tokyo-mono", source: join(root, "tests/kits/tokyo-mono") },
  { name: "tokyo-material", source: join(root, "tests/kits/tokyo-material") },
  { name: "boombox-design", source: process.env.BOOMBOX_DESIGN, inputs: ["design", "preview", "VERSION", "kumiko.config.mjs"], css: "docs/playground/boombox-design.css" },
];

/** The CLIs to run: GOLDEN_CLI=old or new picks one, and the default is both. */
export const clis = (): Cli[] => {
  const picked = process.env.GOLDEN_CLI;
  if (picked === undefined || picked === "" || picked === "both") return ["old", "new"];
  if (picked === "old" || picked === "new") return [picked];
  throw new Error(`GOLDEN_CLI is "${picked}"; use old, new or both`);
};

// The old CLI is BREACAN_BIN (the compiled binary) or the source under Bun; the new core always runs from source.
const command = (cli: Cli) => cli === "new" ? ["bun", join(root, "packages/core/bin/breacan.mjs")]
  : process.env.BREACAN_BIN ? [resolve(process.env.BREACAN_BIN)] : ["bun", join(root, "bin/breacan.mjs")];

/** The addon whose output a path is, or undefined when no addon's golden covers it. */
export const owner = (kit: string, path: string): string | undefined => {
  if (path.startsWith("ports/obsidian/")) return "obsidian";
  if (path.startsWith("ports/mealie/")) return "mealie";
  if (/-beer\.css$/.test(path)) return "beer";
  if (path === "docs/playground/index.html") return "playground";
  if (/^docs\/playground\/[^/]+\.css$/.test(path) || path === "src/styles/tokens.css") return "css";
  if (path.startsWith("ports/tokens/")) return "dtcg";
  if (path.startsWith("ports/react-native/")) return "react-native";
  if (path.startsWith("ports/claude-design/")) return "claude-design";
  if (kit === "tokyo-material" && path.startsWith("plugins/")) return "agent-plugin";
  if (kit === "tokyo-mono" && /^(base16|ports|plugins)\//.test(path)) return "template";
  return undefined;
};

// Each CLI reads its own root files, and the other's would only confuse a reader of the scratch copy.
const otherCliFiles: Record<Cli, string[]> = { old: ["theme.toml", "breacan.config.ts"], new: ["breacan.config.mjs"] };

/** Copy the kit into `dir` as `cli` reads it, and migrate what the checkout lacks: the old config from the tag's
 * kumiko.config.mjs, and the new project (theme.toml, breacan.config.ts, the core in node_modules) from design/theme.toml. */
export const prepare = (cli: Cli, kit: Kit, dir: string) => {
  const source = kit.source!;
  cpSync(source, dir, {
    recursive: true,
    filter: (path) => {
      const rel = relative(source, path);
      return !otherCliFiles[cli].includes(rel) && (!kit.inputs || rel === "" || kit.inputs.includes(rel.split(sep)[0]));
    },
  });
  if (cli === "old" && !existsSync(join(dir, "breacan.config.mjs"))) {
    const config = readFileSync(join(dir, "kumiko.config.mjs"), "utf8")
      .replace("targets:", "modules:").replace(/, "storybook"/, "").replace(/^ *storybook:.*\n/m, "");
    if (config.includes("storybook")) throw new Error(`${kit.name}: kumiko.config.mjs still names storybook after migration`);
    writeFileSync(join(dir, "breacan.config.mjs"), config);
  }
  if (cli === "new") {
    if (!existsSync(join(dir, "theme.toml"))) writeFileSync(join(dir, "theme.toml"), migrateTheme(source));
    if (!existsSync(join(dir, "breacan.config.ts")) && kit.css) {
      writeFileSync(join(dir, "breacan.config.ts"),
        `import { defineConfig } from "breacan";\nexport default defineConfig({ options: { breacan: { path: ${JSON.stringify(kit.css)} } } });\n`);
    }
    mkdirSync(join(dir, "node_modules"), { recursive: true });
    symlinkSync(join(root, "packages/core"), join(dir, "node_modules/breacan"));
  }
};

/** The names of the output parts the new core has in the prepared project. */
export const outputNames = async (dir: string): Promise<string[]> => partsOf(await loadProject(dir), "output").map((part) => part.name);

const sha = (file: string) => createHash("sha256").update(readFileSync(file)).digest("hex");

/** Run `breacan build` in the prepared `dir` and return each addon's files, path → sha256. Fails on a nonzero exit,
 * any stderr, or a written path no addon owns, so no output dodges the goldens. */
export const build = (cli: Cli, kit: Kit, dir: string): Golden => {
  const result = Bun.spawnSync([...command(cli), "build"], { cwd: dir, stderr: "pipe" });
  const stderr = result.stderr.toString();
  if (result.exitCode !== 0 || stderr !== "") throw new Error(`${cli} breacan build of ${kit.name} exited ${result.exitCode}: ${stderr}`);
  const { outputs } = JSON.parse(readFileSync(join(dir, "breacan.receipt.json"), "utf8")) as { outputs: { path: string }[] };
  const built: Golden = {};
  for (const { path } of outputs) {
    const addon = owner(kit.name, path);
    if (addon === undefined) throw new Error(`no addon owns ${path} in ${kit.name}; add a rule to owner() in tests/golden.ts`);
    (built[addon] ??= {})[path] = sha(join(dir, path));
  }
  return built;
};

const goldenFile = (cli: Cli, addon: string) => join(root, "tests/kits/golden", ...(cli === "new" ? ["new"] : []), `${addon}.json`);
export const readGolden = (cli: Cli, addon: string): Golden => existsSync(goldenFile(cli, addon)) ? JSON.parse(readFileSync(goldenFile(cli, addon), "utf8")) : {};

/** Replace one kit's section of an addon's golden, or remove it with `undefined`; an empty file is removed. */
export const writeGolden = (cli: Cli, addon: string, kit: string, files: Record<string, string> | undefined) => {
  const golden = readGolden(cli, addon);
  if (files) golden[kit] = files; else delete golden[kit];
  const file = goldenFile(cli, addon);
  if (Object.keys(golden).length === 0) return rmSync(file, { force: true });
  const sort = (object: Record<string, unknown>) => Object.fromEntries(Object.entries(object).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, `${JSON.stringify(sort(Object.fromEntries(Object.entries(golden).map(([name, entries]) => [name, sort(entries)]))), null, 2)}\n`);
};

/** Every addon with a golden, old or new. */
export const goldenAddons = (): string[] => [...new Set(["tests/kits/golden", "tests/kits/golden/new"].flatMap((dir) =>
  existsSync(join(root, dir)) ? readdirSync(join(root, dir)).filter((name) => name.endsWith(".json")).map((name) => name.slice(0, -5)) : []))].sort();

/** The files an addon's kit must build to under `cli`: the new core's own golden where it has one, else the old. */
export const expected = (cli: Cli, addon: string, kit: string): Record<string, string> | undefined =>
  (cli === "new" ? readGolden("new", addon)[kit] : undefined) ?? readGolden("old", addon)[kit];
