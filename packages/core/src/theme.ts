// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// theme.toml in, resolved tokens out, through one DTCG 2025.10 resolver document
// (https://www.designtokens.org/tr/2025.10/resolver/). The theme starts from a base, and a base may start from
// another; each base in the chain is one set, the theme's palette and roles the last. The resolution order is the
// chain root first, then the theme, so each layer overrides the one before it.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { BasePart, Options, Theme, Token, TokenTree } from "./addon.ts";
import { srgb } from "./color.mjs";
import { resolve } from "./resolve.mjs";

export const THEME = "theme.toml";
export const DEFAULT_BASE = "neutral";
const KEYS = ["name", "base", "palette", "roles"];
const NAME = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const HEX = /^#[0-9a-fA-F]{6}$/;
const LENGTH = /^(-?\d*\.?\d+)(px|rem)$/;

const isTable = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const fail = (message: string): never => { throw new Error(`theme.toml: ${message}`); };

// TOML nests a dotted key (color.surface.default = …) into tables; a role is the path down to a value.
const flatten = (table: Record<string, unknown>, at: string[] = []): [string, unknown][] => Object.entries(table).flatMap(([key, value]) =>
  isTable(value) ? flatten(value, [...at, key]) : [[[...at, key].join("."), value] as [string, unknown]]);

export const readTheme = async (root: string, file: string): Promise<Theme> => {
  let text;
  try { text = await readFile(join(root, file), "utf8"); }
  catch (error) { throw new Error(`${file}: ${(error as NodeJS.ErrnoException).code === "ENOENT" ? "not found; run breacan init" : (error as Error).message}`, { cause: error }); }
  let toml: unknown;
  try { toml = Bun.TOML.parse(text); }
  catch (error) { return fail(`not valid TOML (${(error as Error).message})`); }
  if (!isTable(toml)) return fail("not a table");
  for (const key of Object.keys(toml)) if (!KEYS.includes(key)) fail(`unknown key "${key}" (expected ${KEYS.join(", ")})`);
  const name = toml.name ?? "theme";
  if (typeof name !== "string" || !NAME.test(name)) fail(`name ${JSON.stringify(name)} must be letters, digits, "-" or "_"`);
  const base = toml.base ?? DEFAULT_BASE;
  if (typeof base !== "string" || !base) fail("base must name a base, such as \"neutral\"");
  const palette: Record<string, string> = {};
  if (toml.palette !== undefined && !isTable(toml.palette)) fail("[palette] must be a table");
  for (const [key, hex] of Object.entries((toml.palette ?? {}) as Record<string, unknown>)) {
    if (!NAME.test(key)) fail(`[palette] "${key}" is not a valid name`);
    if (typeof hex !== "string" || !HEX.test(hex)) fail(`[palette] ${key} must be a hex like #rrggbb, not ${JSON.stringify(hex)}`);
    palette[key] = hex as string;
  }
  if (toml.roles !== undefined && !isTable(toml.roles)) fail("[roles] must be a table");
  const roles: Record<string, string | number> = {};
  for (const [path, value] of flatten((toml.roles ?? {}) as Record<string, unknown>)) {
    if (typeof value !== "string" && typeof value !== "number") fail(`[roles] ${path} must be a palette name, a hex, a length or a number`);
    roles[path] = value as string | number;
  }
  return { root, file, name: name as string, base: base as string, palette, roles };
};

// The base chain from the theme's base down to its root, returned root first.
export const chain = (name: string, bases: BasePart[]): BasePart[] => {
  const found: BasePart[] = [];
  for (let next: string | undefined = name; next !== undefined; next = found.at(-1)!.base) {
    const base = bases.find((each) => each.name === next);
    if (!base) fail(`base "${next}" is not one this project has (bases: ${bases.map((each) => each.name).join(", ")})`);
    if (found.includes(base!)) fail(`base "${next}" starts from itself (${[...found, base!].map((each) => each.name).join(" → ")})`);
    found.push(base!);
  }
  return found.reverse();
};

// A role path's token in a tree, with the $type its groups pass down.
const lookup = (tree: TokenTree, path: string) => {
  let node: unknown = tree;
  let type: unknown;
  for (const part of path.split(".")) {
    if (!isTable(node) || !isTable(node[part])) return undefined;
    type = node.$type ?? type;
    node = node[part];
  }
  return isTable(node) && "$value" in node ? { type: node.$type ?? type } : undefined;
};

const put = (tree: TokenTree, path: string, token: unknown) => {
  const parts = path.split(".");
  let node = tree;
  for (const part of parts.slice(0, -1)) node = (node[part] ??= {}) as TokenTree;
  node[parts.at(-1)!] = token;
};

// One [roles] value as a token: a palette name aliases that colour; a hex, a length or a number is the value.
const roleToken = (path: string, value: string | number, palette: Record<string, string>) => {
  if (typeof value === "number") return { $type: "number", $value: value };
  if (Object.hasOwn(palette, value)) return { $type: "color", $value: `{palette.${value}}` };
  if (HEX.test(value)) return { $type: "color", $value: srgb(value) };
  const length = value.match(LENGTH);
  if (length) return { $type: "dimension", $value: { value: Number(length[1]), unit: length[2] } };
  return fail(`[roles] ${path} = ${JSON.stringify(value)} is not a palette colour (palette: ${Object.keys(palette).join(", ") || "none"}), a hex, a px or rem length, or a number`);
};

/** A DTCG 2025.10 resolver document. */
export interface ResolverDocument {
  version: "2025.10";
  name: string;
  sets: Record<string, { sources: TokenTree[] }>;
  resolutionOrder: { $ref: string }[];
}

// The theme over its base chain. A role must be one the chain defines, with the same type, so a misspelled role or
// a colour given to a corner fails here.
export const compile = (theme: Theme, bases: BasePart[], optionsFor: (part: BasePart) => Options): ResolverDocument => {
  const sets: ResolverDocument["sets"] = {};
  const trees = chain(theme.base, bases).map((base) => {
    if (base.name === "theme") fail('a base cannot be named "theme"; the theme\'s own set has that name');
    const tree = base.tokens({ options: optionsFor(base) });
    sets[base.name] = { sources: [tree] };
    return tree;
  });
  const roles: TokenTree = {};
  for (const [path, value] of Object.entries(theme.roles)) {
    const known = trees.map((tree) => lookup(tree, path)).findLast(Boolean);
    if (!known) fail(`[roles] ${path} is not a role base "${theme.base}" has`);
    const token = roleToken(path, value, theme.palette);
    if (token.$type !== known!.type) fail(`[roles] ${path} is a ${known!.type}, not a ${token.$type}`);
    put(roles, path, token);
  }
  const palette = Object.fromEntries(Object.entries(theme.palette).map(([key, hex]) => [key, { $value: srgb(hex) }]));
  sets.theme = { sources: [{ ...(Object.keys(palette).length && { palette: { $type: "color", ...palette } }), ...roles }] };
  return { version: "2025.10", name: theme.name, sets, resolutionOrder: Object.keys(sets).map((name) => ({ $ref: `#/sets/${name}` })) };
};

// The document's tokens, each set's sources merged in resolution order.
// shortcut: reads only references to its own sets with inline sources, which is all compile() writes; read
// modifiers and file references when the dial becomes a modifier.
export const apply = (document: ResolverDocument): Token[] => resolve(document.resolutionOrder.flatMap(({ $ref }) => {
  const name = $ref.match(/^#\/sets\/([^/]+)$/)?.[1];
  const set = name === undefined ? undefined : document.sets[name];
  if (!set) throw new Error(`resolver: ${$ref} is not one of this document's sets`);
  return set.sources.map((tree) => ({ tree, file: `set ${name}` }));
}));
