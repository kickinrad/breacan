// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// theme.toml in, resolved tokens out, through one DTCG 2025.10 resolver document
// (https://www.designtokens.org/tr/2025.10/resolver/). The theme starts from a base, and a base may start from
// another; each base in the chain is one set, the theme's palette and roles the last. The resolution order is the
// chain root first, then the theme, so each layer overrides the one before it.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { BasePart, InputPart, InputResult, Permutation, Token, TokenTree } from "./addon.ts";
import { srgb } from "./color.mjs";
import { resolve } from "./resolve.mjs";

export const THEME = "theme.toml";
export const DEFAULT_BASE = "neutral";
const KEYS = ["name", "base", "palette", "roles"];
const NAME = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const HEX = /^#[0-9a-fA-F]{6}$/;
const LENGTH = /^(-?\d*\.?\d+)(px|rem)$/;

/** A project's theme.toml, read and checked. Internal: outputs get only its name. */
export interface Theme {
  /** theme.toml's path from the root. */
  file: string;
  name: string;
  /** The base the theme starts from. */
  base: string;
  /** Named raw colours, as #rrggbb. */
  palette: Record<string, string>;
  /** Role paths to the values theme.toml gives them. */
  roles: Record<string, string | number>;
}

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
  return { file, name: name as string, base: base as string, palette, roles };
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

// Every input of the project, run before the bases, with what it returned. An input's name is its set's name, so it
// cannot take the theme's or a base's.
export const loadInputs = async (inputs: InputPart[], resultOf: (input: InputPart) => ReturnType<InputPart["load"]>) => {
  const loaded: { name: string; result: InputResult }[] = [];
  for (const input of inputs) {
    if (input.name === "theme") fail('an input cannot be named "theme"; the theme\'s own set has that name');
    const result = await resultOf(input);
    if (!isTable(result)) throw new Error(`input ${input.name}: load() must return { palette?, tokens? }`);
    for (const [key, hex] of Object.entries(result.palette ?? {})) {
      if (!NAME.test(key) || typeof hex !== "string" || !HEX.test(hex)) throw new Error(`input ${input.name}: palette ${JSON.stringify(key)} must be a name and a hex like #rrggbb`);
    }
    if (result.tokens !== undefined && !isTable(result.tokens)) throw new Error(`input ${input.name}: tokens must be a token tree`);
    loaded.push({ name: input.name, result });
  }
  return loaded;
};

// Each base in the theme's chain, root first, with the tree it returns.
// shortcut: a base's other modes are refused, and its mapping table is not read; both arrive with task 5b.
export const loadBases = async (theme: Theme, bases: BasePart[], tokensOf: (base: BasePart) => ReturnType<BasePart["tokens"]>) => {
  const loaded: { name: string; tree: TokenTree }[] = [];
  for (const base of chain(theme.base, bases)) {
    if (base.name === "theme") fail('a base cannot be named "theme"; the theme\'s own set has that name');
    const result = await tokensOf(base);
    if (!isTable(result) || !isTable(result.tokens)) throw new Error(`base ${base.name}: tokens() must return { tokens }`);
    if (result.modes !== undefined) throw new Error(`base ${base.name} returns modes, which this core does not build yet`);
    loaded.push({ name: base.name, tree: result.tokens });
  }
  return loaded;
};

// The theme over its loaded base chain. A role must be one the chain defines, with the same type, so a misspelled
// role or a colour given to a corner fails here.
// Each input's tokens are a set after the bases, and its palette sits under the theme's own.
export const compile = (theme: Theme, bases: { name: string; tree: TokenTree }[], inputs: { name: string; result: InputResult }[] = []): ResolverDocument => {
  const sets: ResolverDocument["sets"] = Object.fromEntries(bases.map(({ name, tree }) => [name, { sources: [tree] }]));
  for (const { name, result } of inputs) {
    if (sets[name]) fail(`input "${name}" has the name of a base; a part's name is unique`);
    if (result.tokens) sets[name] = { sources: [result.tokens] };
  }
  const given = Object.assign({}, ...inputs.map(({ result }) => result.palette), theme.palette) as Record<string, string>;
  const roles: TokenTree = {};
  for (const [path, value] of Object.entries(theme.roles)) {
    const known = bases.map(({ tree }) => lookup(tree, path)).findLast(Boolean);
    if (!known) fail(`[roles] ${path} is not a role base "${theme.base}" has`);
    const token = roleToken(path, value, given);
    if (token.$type !== known!.type) fail(`[roles] ${path} is a ${known!.type}, not a ${token.$type}`);
    put(roles, path, token);
  }
  const palette = Object.fromEntries(Object.entries(given).map(([key, hex]) => [key, { $value: srgb(hex) }]));
  sets.theme = { sources: [{ ...(Object.keys(palette).length && { palette: { $type: "color", ...palette } }), ...roles }] };
  return { version: "2025.10", name: theme.name, sets, resolutionOrder: Object.keys(sets).map((name) => ({ $ref: `#/sets/${name}` })) };
};

// The document's permutations: today one, with no modifier input, each set's sources merged in resolution order.
// shortcut: reads only references to its own sets with inline sources, which is all compile() writes; read
// modifiers and file references when the dial becomes a modifier.
export const apply = (document: ResolverDocument): Permutation[] => {
  const layers = document.resolutionOrder.flatMap(({ $ref }) => {
    const name = $ref.match(/^#\/sets\/([^/]+)$/)?.[1];
    const set = name === undefined ? undefined : document.sets[name];
    if (!set) throw new Error(`resolver: ${$ref} is not one of this document's sets`);
    return set.sources.map((tree) => ({ tree, file: `set ${name}` }));
  });
  const tokens = resolve(layers).map(({ path, segments, type, raw, alias, description }) =>
    ({ path, segments, type, value: raw, ...(alias && { alias }), ...(description && { description }) }) as Token);
  return [{ input: {}, tokens }];
};
