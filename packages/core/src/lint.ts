// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// Drift guard: flag a value a consumer hand-typed that the theme defines. Text scanning, line by line, so it reads any
// source file. The built-in rules cover colour, motion, type size, radius, spacing and z-index; an addon adds its own
// through a part's `rules`. The checks follow the static gates of ux-ui-agent-skills (MIT): no hard-coded values.
import { readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import type { LintRule } from "./addon.ts";
import { hasHeader } from "./header.mjs";

export const EXTENSIONS = new Set([
  ".css", ".scss", ".yaml", ".yml", ".py", ".js", ".mjs", ".ts", ".jinja", ".html", ".kt", ".kts",
  ".astro", ".tsx", ".jsx", ".vue", ".svelte",
]);
const OWN = /lint: own\s+[^\s*/>-]/; // a reason, not just a comment closer
const NUM = String.raw`(?<![\w.])\d*\.?\d+`;

// A match whose number is zero is not a finding.
const pattern = (name: string, regex: RegExp): LintRule => ({
  name,
  check: (line) => [...line.matchAll(regex)].map(([match]) => match).filter((match) => parseFloat(match) !== 0),
});
export const BUILTIN_RULES: LintRule[] = [
  pattern("colour", /(?<!\w)#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![0-9a-zA-Z])/g), // not repo#123
  pattern("colour", /\b(?:rgba?|hsla?)\(\s*\d/g),
  pattern("colour", /\bColor\(\s*0x[0-9a-fA-F]+/g),
  pattern("motion", new RegExp(String.raw`(?<=\b(?:transition|animation)[\w-]*\s*:[^;}]*?)${NUM}m?s\b`, "g")),
  pattern("motion", /cubic-bezier\(/g),
  pattern("motion", /(?<=\btween\(\s*)\d+/g),
  pattern("type size", new RegExp(String.raw`(?<=font-size\s*:\s*)${NUM}px\b`, "g")),
  pattern("type size", /(?<![\w.])\d+(?:\.\d+)?\.sp\b/g),
  pattern("radius", new RegExp(String.raw`(?<=border-radius\s*:[^;}]*?)${NUM}px\b`, "g")),
  pattern("radius", /(?<=RoundedCornerShape\(\s*)\d+(?:\.\d+)?\.dp\b/g),
  pattern("spacing", new RegExp(String.raw`(?<=\b(?:margin|padding|gap|row-gap|column-gap)[\w-]*\s*:[^;}]*?)${NUM}px\b`, "g")),
  pattern("spacing", /(?<=\b(?:padding|spacedBy)\([^)]*?)\d+(?:\.\d+)?\.dp\b/g),
  pattern("z-index", /(?<=z-index\s*:\s*)-?\d+/g),
  pattern("z-index", /(?<=\.zIndex\(\s*)-?\d+/g),
];

// A file, or every file under a directory with a linted extension, skipping hidden folders and node_modules.
const files = (path: string): string[] => {
  let stat;
  try { stat = statSync(path); } catch { throw new Error(`${path}: no such file or directory`); }
  if (!stat.isFile()) {
    return [...new Bun.Glob("**/*").scanSync({ cwd: path })].sort()
      .filter((file) => EXTENSIONS.has(extname(file)) && !file.split("/").includes("node_modules")).map((file) => join(path, file));
  }
  return EXTENSIONS.has(extname(path)) ? [path] : [];
};

/** One `path:line: rule: text` string per finding; throws on a missing path. `extra` is the addons' rules. */
export const lint = (paths: string[], extra: LintRule[] = []): string[] => {
  const rules = [...BUILTIN_RULES, ...extra];
  const found: string[] = [];
  for (const file of paths.flatMap(files)) {
    const text = readFileSync(file, "utf8");
    if (hasHeader(text)) continue;
    const mine = rules.filter((rule) => !rule.extensions || rule.extensions.includes(extname(file)));
    text.split("\n").forEach((line, index) => {
      if (OWN.test(line)) return;
      for (const rule of mine) for (const match of rule.check(line, file)) found.push(`${file}:${index + 1}: ${rule.name}: ${match}`);
    });
  }
  return found;
};
