// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// The material addon's base: Material 3's baseline values as the core's roles, starting from `neutral`. The mapping
// table (mapping.json) holds one row per core role and drives the base: a published row takes the Material token it
// names, or its own value; a derived row runs its derivation below; a kept row leaves the role to `neutral`. The base
// also sets each Material colour role no core role takes, under its own md.sys.color name, for
// [platform.material.roles]. The `dark` mode builds the dark scheme; any other mode, the light one.
import { argbFromHex, customColor, hexFromArgb } from "@material/material-color-utilities";
import { defineAddon, defineBase, roleAt, type Mapping, type MappingRow, type TokenTree } from "breacan";
import { srgb, textSafe } from "breacan/color";
import table from "../mapping.json" with { type: "json" };
import { colors, vendored } from "./colors.ts";

/** A row of mapping.json: the core's mapping row, with the value a published role takes when no token holds it. */
export interface MaterialRow extends MappingRow {
  /** The value itself, for a role Material publishes in its docs rather than its tokens. */
  value?: unknown;
  /** A token holding the colour's opacity, such as the scrim's. */
  opacity?: string;
}
export const rows = table.roles as Record<string, MaterialRow>;

type Scheme = Record<string, string>;

// A vendored token by path, such as md.sys.shape.corner.small, with its group's type.
const tokenAt = (path: string): { $value: any; $type?: string } => {
  let node: any = vendored;
  for (const part of path.split(".")) node = node?.[part];
  if (node?.$value === undefined) throw new Error(`material: mapping.json names ${path}, which is not a Material token`);
  return node;
};
// A {md.ref.typeface.*} alias, followed to its value.
const follow = (value: unknown) => typeof value === "string" && /^\{.+\}$/.test(value) ? tokenAt(value.slice(1, -1)).$value : value;
const colour = (hex: string, alpha?: number) => {
  const { hex: plain, ...value } = srgb(hex);
  return { ...value, ...(alpha !== undefined && { alpha }), hex: plain };
};

// A Material type style as a DTCG typography value. Its face aliases the core's font role, so a theme's font moves
// it; the brand face is font.display and the plain one font.body. Line height becomes DTCG's ratio to the size.
const typography = (style: string) => {
  const part = (name: string) => tokenAt(`${style}.${name}`).$value;
  const size = part("size");
  return {
    fontFamily: part("font") === "{md.ref.typeface.brand}" ? "{font.display}" : "{font.body}",
    fontSize: size,
    fontWeight: follow(part("weight")),
    lineHeight: Math.round(part("line-height").value / size.value * 1e4) / 1e4,
    letterSpacing: part("tracking"),
  };
};

const published = (row: MaterialRow, scheme: Scheme) => {
  if (row.value !== undefined) return row.value;
  const token = row.token!;
  if (token.startsWith("md.sys.color.")) return colour(scheme[token.slice("md.sys.color.".length)], row.opacity && tokenAt(row.opacity).$value);
  if (token.startsWith("md.sys.typescale.")) return typography(token);
  return tokenAt(token).$value;
};

// Material's custom colour for a status: its seed harmonized to the scheme's primary, at Material's tones.
const status = (seed: string, part: "color" | "onColor") => (_: Scheme, dark: boolean) => {
  const group = customColor(argbFromHex(colors("light").primary), { value: argbFromHex(seed), name: seed, blend: true });
  return colour(hexFromArgb((dark ? group.dark : group.light)[part]));
};
const SEEDS = { success: "#1a7f37", warning: "#9a6700", info: "#0969da" };

/** Each derived role's derivation; mapping.json cites each one. */
export const derivations: Record<string, (scheme: Scheme, dark: boolean) => unknown> = {
  "color.text.subtle": (scheme) => colour(textSafe(scheme.outline, scheme["on-surface-variant"], [scheme.surface, scheme["surface-container-low"]]).value),
  ...Object.fromEntries(Object.entries(SEEDS).flatMap(([name, seed]) => [
    [`color.status.${name}`, status(seed, "color")],
    [`color.on-status.${name}`, status(seed, "onColor")],
  ])),
};

const put = (tree: TokenTree, path: string, token: unknown) => {
  const parts = path.split(".");
  let node = tree;
  for (const part of parts.slice(0, -1)) node = (node[part] ??= {}) as TokenTree;
  node[parts.at(-1)!] = token;
};

/** Material's values as the core's roles, for the light or the dark scheme, and the mapping table. */
export const materialTokens = (dark: boolean) => {
  const scheme = colors(dark ? "dark" : "light");
  const tokens: TokenTree = {};
  const mapping: Mapping = {};
  const taken = new Set<string>();
  for (const [role, full] of Object.entries(rows)) {
    const { value, opacity, ...row } = full;
    const type = roleAt(role)?.type;
    if (!type) throw new Error(`material: mapping.json names ${role}, which is not a core role`);
    mapping[role] = row;
    if (row.token?.startsWith("md.sys.color.")) taken.add(row.token);
    if (row.source === "kept") continue;
    const derive = derivations[role];
    if (row.source === "derived" && !derive) throw new Error(`material: mapping.json says ${role} is derived, and the base has no derivation for it`);
    put(tokens, role, { $type: type, $value: row.source === "derived" ? derive(scheme, dark) : published(full, scheme) });
  }
  for (const [name, hex] of Object.entries(scheme)) {
    if (!taken.has(`md.sys.color.${name}`)) put(tokens, `md.sys.color.${name}`, { $type: "color", $value: colour(hex) });
  }
  return { tokens, mapping };
};

/** The material addon: `addons: [material]` in breacan.config.ts, then `base = "material"` in theme.toml. */
export default defineAddon({
  name: "@breacan/material",
  parts: [defineBase({ name: "material", base: "neutral", tokens: ({ mode }) => materialTokens(mode === "dark") })],
});
