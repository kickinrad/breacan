// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// theme.toml in, resolved tokens out, through one DTCG 2025.10 resolver document
// (https://www.designtokens.org/tr/2025.10/resolver/). The theme starts from a base, and a base may start from
// another; each base in the chain is one set, the theme's palette and roles the last. The resolution order is the
// chain root first, then the theme, so each layer overrides the one before it. [roles] sets core roles
// (roles.ts); [platform.<name>.roles] sets the roles base <name> has of its own, such as Material's md.sys.*.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { BasePart, Mapping, Permutation, Token, TokenTree } from "./addon.ts";
import { srgb } from "./color.mjs";
import { resolve } from "./resolve.mjs";
import { ROLES, roleAt } from "./roles.ts";

export const THEME = "theme.toml";
export const DEFAULT_BASE = "neutral";
const KEYS = ["name", "base", "palette", "roles", "platform"];
const PLATFORM_KEYS = ["roles"];
const SOURCES = ["published", "derived", "kept"];
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
  /** Each [platform.<name>.roles]: a base's own role paths to their values, by base name. */
  platform: Record<string, Record<string, string | number>>;
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
  const platform: Theme["platform"] = {};
  if (toml.platform !== undefined && !isTable(toml.platform)) fail("[platform] must be a table of platforms, such as [platform.material.roles]");
  for (const [each, table] of Object.entries((toml.platform ?? {}) as Record<string, unknown>)) {
    if (!isTable(table)) fail(`[platform.${each}] must be a table`);
    for (const key of Object.keys(table as object)) if (!PLATFORM_KEYS.includes(key)) fail(`[platform.${each}] has an unknown key "${key}" (expected ${PLATFORM_KEYS.join(", ")})`);
    platform[each] = readRoles(`platform.${each}.roles`, (table as Record<string, unknown>).roles);
  }
  return { file, name: name as string, base: base as string, palette, roles: readRoles("roles", toml.roles), platform };
};

// A roles table's values by role path: each a palette name, a hex, a length or a number.
const readRoles = (table: string, value: unknown) => {
  if (value !== undefined && !isTable(value)) fail(`[${table}] must be a table`);
  const roles: Record<string, string | number> = {};
  for (const [path, each] of flatten((value ?? {}) as Record<string, unknown>)) {
    if (typeof each !== "string" && typeof each !== "number") fail(`[${table}] ${path} must be a palette name, a hex, a length or a number`);
    roles[path] = each as string | number;
  }
  return roles;
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
const roleToken = (table: string, path: string, value: string | number, palette: Record<string, string>) => {
  if (typeof value === "number") return { $type: "number", $value: value };
  if (Object.hasOwn(palette, value)) return { $type: "color", $value: `{palette.${value}}` };
  if (HEX.test(value)) return { $type: "color", $value: srgb(value) };
  const length = value.match(LENGTH);
  if (length) return { $type: "dimension", $value: { value: Number(length[1]), unit: length[2] } };
  return fail(`[${table}] ${path} = ${JSON.stringify(value)} is not a palette colour (palette: ${Object.keys(palette).join(", ") || "none"}), a hex, a px or rem length, or a number`);
};

/** A DTCG 2025.10 resolver document. */
export interface ResolverDocument {
  version: "2025.10";
  name: string;
  sets: Record<string, { sources: TokenTree[] }>;
  resolutionOrder: { $ref: string }[];
}

// A base's tree gives each core role it sets the role's type, and its mapping table, when it returns one, holds
// core roles only, each with a source that matches the tree: a published or derived role is set, a kept one is not.
const checkBase = (base: string, tree: TokenTree, mapping: Mapping | undefined) => {
  for (const role of ROLES) {
    const found = lookup(tree, role.path);
    if (found?.type !== undefined && found.type !== role.type) throw new Error(`base ${base}: ${role.path} is a ${role.type} role, not a ${found.type}`);
  }
  if (mapping === undefined) return;
  if (!isTable(mapping)) throw new Error(`base ${base}: mapping must map role paths to rows`);
  for (const [path, row] of Object.entries(mapping)) {
    if (!roleAt(path)) throw new Error(`base ${base}: its mapping names ${path}, which is not a core role`);
    if (!SOURCES.includes(row?.source)) throw new Error(`base ${base}: its mapping gives ${path} the source ${JSON.stringify(row?.source)} (expected ${SOURCES.join(", ")})`);
    const sets = lookup(tree, path) !== undefined;
    if ((row.source === "kept") === sets) throw new Error(`base ${base}: its mapping says ${path} is ${row.source}, but the base ${sets ? "sets" : "does not set"} it`);
  }
};

// Each base in the theme's chain, root first, with the tree it returns. Together they give every core role a value.
// shortcut: a base's other modes are refused; build them when theme.toml has [modes].
export const loadBases = async (theme: Theme, bases: BasePart[], tokensOf: (base: BasePart) => ReturnType<BasePart["tokens"]>) => {
  const loaded: { name: string; tree: TokenTree }[] = [];
  for (const base of chain(theme.base, bases)) {
    if (base.name === "theme") fail('a base cannot be named "theme"; the theme\'s own set has that name');
    const result = await tokensOf(base);
    if (!isTable(result) || !isTable(result.tokens)) throw new Error(`base ${base.name}: tokens() must return { tokens }`);
    if (result.modes !== undefined) throw new Error(`base ${base.name} returns modes, which this core does not build yet`);
    checkBase(base.name, result.tokens, result.mapping);
    loaded.push({ name: base.name, tree: result.tokens });
  }
  const missing = ROLES.filter((role) => !loaded.some(({ tree }) => lookup(tree, role.path))).map((role) => role.path);
  if (missing.length) throw new Error(`the base chain ${loaded.map(({ name }) => name).join(" → ")} gives no value to ${missing.join(", ")}`);
  return loaded;
};

// The theme over its loaded base chain. A [roles] path must be a core role, and a [platform.<name>.roles] path one
// that base <name>, in the chain, has of its own; each value must have the role's type. So a misspelled role, a
// platform's role set as a core one, or a colour given to a corner fails here.
export const compile = (theme: Theme, bases: { name: string; tree: TokenTree }[]): ResolverDocument => {
  const sets: ResolverDocument["sets"] = Object.fromEntries(bases.map(({ name, tree }) => [name, { sources: [tree] }]));
  const roles: TokenTree = {};
  const set = (table: string, path: string, value: string | number, type: unknown) => {
    const token = roleToken(table, path, value, theme.palette);
    if (type !== undefined && token.$type !== type) fail(`[${table}] ${path} is a ${type}, not a ${token.$type}`);
    put(roles, path, token);
  };
  for (const [path, value] of Object.entries(theme.roles)) {
    const role = roleAt(path);
    if (!role) {
      const owner = bases.findLast(({ tree }) => lookup(tree, path));
      fail(owner
        ? `[roles] ${path} is not a core role; it is base ${owner.name}'s own, so set it under [platform.${owner.name}.roles]`
        : `[roles] ${path} is not a role (docs/core.md lists the core roles)`);
    }
    set("roles", path, value, role!.type);
  }
  for (const [name, platformRoles] of Object.entries(theme.platform)) {
    const base = bases.find((each) => each.name === name);
    // shortcut: a platform is a base in the theme's chain; let it be any platform base once the dial layers one in.
    if (!base) fail(`[platform.${name}] names a base this theme does not start from (its chain: ${bases.map((each) => each.name).join(" → ")})`);
    for (const [path, value] of Object.entries(platformRoles)) {
      if (roleAt(path)) fail(`[platform.${name}.roles] ${path} is a core role; set it under [roles]`);
      const known = lookup(base!.tree, path);
      if (!known) fail(`[platform.${name}.roles] ${path} is not a role base ${name} has`);
      set(`platform.${name}.roles`, path, value, known!.type);
    }
  }
  const palette = Object.fromEntries(Object.entries(theme.palette).map(([key, hex]) => [key, { $value: srgb(hex) }]));
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
