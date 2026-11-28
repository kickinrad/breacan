// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// The core's roles: neutral names for jobs, `<property>.<role>.<emphasis>`, that every base fills and every output
// reads. A platform's own names (Material's md.sys.*) are the platform addon's, set under [platform.<name>.roles].
// The neutral base gives each role a value, so a theme on any chain resolves every one.
import type { TokenValues } from "./addon.ts";

/** One core role: its path and its DTCG type. An `optional` role follows `color.accent.*` until a base or theme sets it. */
export interface Role {
  path: string;
  type: keyof TokenValues;
  optional?: boolean;
}

const each = (group: string, names: string[], type: Role["type"], optional?: boolean): Role[] =>
  names.map((name) => ({ path: `${group}.${name}`, type, ...(optional && { optional }) }));
const STATUS = ["danger", "success", "warning", "info"];
const EMPHASIS = ["default", "muted"];

/** Every core role, in the order docs/core.md lists them. */
export const ROLES: readonly Role[] = [
  ...each("color.surface", ["default", "raised", "overlay", "sunken", "inverse"], "color"),
  ...each("color.text", ["default", "muted", "subtle", "inverse"], "color"),
  ...each("color.accent", EMPHASIS, "color"),
  ...each("color.on-accent", EMPHASIS, "color"),
  ...each("color.border", ["default", "subtle"], "color"),
  ...each("color.status", STATUS, "color"),
  ...each("color.on-status", STATUS, "color"),
  ...each("color", ["focus", "scrim"], "color"),
  ...["accent-2", "accent-3"].flatMap((family) => [...each(`color.${family}`, EMPHASIS, "color", true), ...each(`color.on-${family}`, EMPHASIS, "color", true)]),
  ...each("type", ["display", "title", "heading", "body", "label", "caption"], "typography"),
  ...each("font", ["body", "display", "mono"], "fontFamily"),
  ...each("icon", ["set"], "string"),
  ...each("corner", ["control", "container", "overlay", "full"], "dimension"),
  ...each("space", ["3xs", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"], "dimension"),
  ...each("size", ["touch"], "dimension"),
  { path: "density", type: "number" },
  ...each("elevation", ["raised", "overlay"], "dimension"),
  ...each("motion.duration", ["short", "medium", "long"], "duration"),
  ...each("motion.easing", ["standard", "enter", "exit"], "cubicBezier"),
  ...each("state", ["hover", "pressed", "focus", "disabled"], "number"),
];

const BY_PATH = new Map(ROLES.map((role) => [role.path, role]));

/** The core role at a path, or undefined for any other path. */
export const roleAt = (path: string): Role | undefined => BY_PATH.get(path);
