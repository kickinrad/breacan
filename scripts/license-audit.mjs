// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// Fails when a production dependency, direct or transitive, carries a copyleft license or none we can read.
//   bun scripts/license-audit.mjs [--root <dir>]   prints one line per package, then exits 1 on any failure
// It walks package.json's `dependencies` through node_modules the way Node resolves them, so dev dependencies are
// not read. An SPDX `OR` passes when one side is permissive (the licensee picks it); `AND` fails if either side fails.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const COPYLEFT = /^(?:A?GPL|LGPL|MPL|EPL|CDDL|SSPL|EUPL|OSL|CPAL|CC-BY-(?:NC-)?SA)\b/i;
const SPDX = /^[A-Za-z0-9.+-]+$/;

const read = (file) => JSON.parse(readFileSync(file, "utf8"));
const rootArg = process.argv.indexOf("--root");
const root = resolve(rootArg > 0 ? process.argv[rootArg + 1] : ".");

// The license expression a manifest declares, in its modern, legacy-object or legacy-array form.
const declared = (pkg) => {
  const one = (value) => (typeof value === "string" ? value : value?.type);
  if (pkg.license) return one(pkg.license);
  if (Array.isArray(pkg.licenses)) return pkg.licenses.map(one).filter(Boolean).join(" OR ") || undefined;
  return one(pkg.licenses);
};

// "permissive", "copyleft" or "unknown" for one SPDX expression. Free text such as "AGPL v3" or "Limited W3 License" is not
// SPDX: it fails as copyleft when it names a copyleft family, and as unknown otherwise.
const family = (expression) => {
  if (!expression || /^\s*(?:UNLICENSED|SEE LICENSE IN)/i.test(expression)) return "unknown";
  const words = expression.replace(/[()]/g, " ").split(/\s+/).filter(Boolean);
  const ids = words.filter((word) => !/^(?:AND|OR|WITH)$/i.test(word));
  const spdx = ids.length === words.filter((word) => /^(?:AND|OR|WITH)$/i.test(word)).length + 1;
  if (!spdx || !ids.every((id) => SPDX.test(id))) return COPYLEFT.test(expression.trim()) ? "copyleft" : "unknown";
  const sides = (separator) => expression.split(new RegExp(`\\s+${separator}\\s+`, "i")).map((part) => family(part.replace(/^\(|\)$/g, "")));
  if (/\sOR\s/i.test(expression)) {
    const alternatives = sides("OR");
    return alternatives.includes("permissive") ? "permissive" : alternatives.includes("copyleft") ? "copyleft" : "unknown";
  }
  if (/\sAND\s/i.test(expression)) {
    const parts = sides("AND");
    return parts.includes("copyleft") ? "copyleft" : parts.includes("unknown") ? "unknown" : "permissive";
  }
  return COPYLEFT.test(ids[0]) ? "copyleft" : "permissive";
};

// The directory of `name` as Node finds it from `from`: the nearest node_modules up the tree.
const locate = (name, from) => {
  for (let dir = from; ; dir = dirname(dir)) {
    const candidate = join(dir, "node_modules", name);
    if (existsSync(join(candidate, "package.json"))) return candidate;
    if (dir === dirname(dir)) return undefined;
  }
};

const seen = new Map();
const visit = (name, from) => {
  const dir = locate(name, from);
  if (!dir) return; // an optional dependency this platform did not install
  if (seen.has(dir)) return;
  const pkg = read(join(dir, "package.json"));
  const expression = declared(pkg);
  seen.set(dir, { name: pkg.name, version: pkg.version, expression, family: family(expression) });
  for (const dependency of Object.keys({ ...pkg.dependencies, ...pkg.optionalDependencies })) visit(dependency, dir);
};

for (const dependency of Object.keys(read(join(root, "package.json")).dependencies ?? {})) visit(dependency, root);

const rows = [...new Map([...seen.values()].map((row) => [`${row.name}@${row.version}`, row])).values()].sort((a, b) => a.name.localeCompare(b.name));
for (const row of rows) console.log(`${row.family.padEnd(10)} ${(row.expression ?? "(none)").padEnd(32)} ${row.name}@${row.version}`);
const counts = Object.groupBy(rows, (row) => row.family);
console.log(`\n${rows.length} production packages: ${Object.entries(counts).map(([name, list]) => `${list.length} ${name}`).join(", ")}`);
const bad = rows.filter((row) => row.family !== "permissive");
if (bad.length) {
  console.error(`\nlicense audit failed: ${bad.map((row) => `${row.name}@${row.version} (${row.expression ?? "no license"})`).join(", ")}`);
  process.exit(1);
}
