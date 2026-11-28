// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// Old kit inputs to the new core's project shape. A kit's design/theme.toml (palettes per mode, Material roles) becomes
// a theme.toml the new core reads: the night palette and the four neutral roles, each taken from the Material role it
// stands for. Roles the new core does not have yet (modes, faces, tokens, derived, contrast) are dropped; each task
// that adds one extends this map, so the fixtures grow with the core. The two Tokyo fixtures were seeded from it and
// are edited by hand since; Boombox's inputs stay in its private repo, so its theme.toml is made from this each run.
import { readFileSync } from "node:fs";
import { join } from "node:path";

type Table = Record<string, unknown>;
const isTable = (value: unknown): value is Table => value !== null && typeof value === "object" && !Array.isArray(value);
const read = (file: string): Table => Bun.TOML.parse(readFileSync(file, "utf8")) as Table;

/** The neutral role, then the Material role it takes its value from. */
export const NEUTRAL_ROLES: [string, string][] = [
  ["color.surface.default", "md.sys.color.surface"],
  ["color.text.default", "md.sys.color.on-surface"],
  ["color.accent.default", "md.sys.color.primary"],
  ["color.on-accent.default", "md.sys.color.on-primary"],
];

// The night palette: `[palette.night]`, or a flat `[palette]` of colours. A kit that `extends` another file adds to it.
const night = (toml: Table): Record<string, string> => {
  const palette = isTable(toml.palette) ? toml.palette : {};
  const own = isTable(palette.night) ? palette.night : palette;
  return Object.fromEntries(Object.entries(own).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
};

/** theme.toml's text for the kit at `kitDir`, which holds design/theme.toml. */
export const migrateTheme = (kitDir: string): string => {
  const file = join(kitDir, "design/theme.toml");
  const toml = read(file);
  const parent = typeof toml.extends === "string" ? read(join(kitDir, "design", toml.extends)) : {};
  const palette = { ...night(parent), ...night(toml) };
  const roles = { ...(isTable(parent.roles) ? parent.roles : {}), ...(isTable(toml.roles) ? toml.roles : {}) };
  const lines = [`name = ${JSON.stringify(toml.name)}`, "", "[palette]", ...Object.entries(palette).map(([key, hex]) => `${key} = ${JSON.stringify(hex)}`)];
  const picked = NEUTRAL_ROLES.flatMap(([role, from]) => {
    const value = typeof roles[from] === "string" ? (roles[from] as string).replace(/^night\./, "") : undefined;
    return value !== undefined && value in palette ? [`${role} = ${JSON.stringify(value)}`] : [];
  });
  return `${[...lines, ...(picked.length ? ["", "[roles]", ...picked] : [])].join("\n")}\n`;
};
