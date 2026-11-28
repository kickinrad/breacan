// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// Material 3's baseline colour roles, light and dark, from the vendored androidx tokens (material/, Apache-2.0).
// The vendored roles are ColorDarkTokens.kt's; ColorLightTokens.kt names each light role's tone in the same palettes.
// https://m3.material.io/styles/color/roles
import vendored from "../../../material/material.tokens.json" with { type: "json" };

export { vendored };

const DARK: Record<string, { $value: string }> = vendored.md.sys.color;
const PALETTE: Record<string, { $value: string }> = vendored.md.ref.palette;

const LIGHT: Record<string, string> = {
  background: "neutral98", error: "error40", "error-container": "error90", "inverse-on-surface": "neutral95",
  "inverse-primary": "primary80", "inverse-surface": "neutral20", "on-background": "neutral10", "on-error": "error100",
  "on-error-container": "error10", "on-primary": "primary100", "on-primary-container": "primary10",
  "on-primary-fixed": "primary10", "on-primary-fixed-variant": "primary30", "on-secondary": "secondary100",
  "on-secondary-container": "secondary10", "on-secondary-fixed": "secondary10", "on-secondary-fixed-variant": "secondary30",
  "on-surface": "neutral10", "on-surface-variant": "neutral-variant30", "on-tertiary": "tertiary100",
  "on-tertiary-container": "tertiary10", "on-tertiary-fixed": "tertiary10", "on-tertiary-fixed-variant": "tertiary30",
  outline: "neutral-variant50", "outline-variant": "neutral-variant80", primary: "primary40",
  "primary-container": "primary90", "primary-fixed": "primary90", "primary-fixed-dim": "primary80", scrim: "neutral0",
  secondary: "secondary40", "secondary-container": "secondary90", "secondary-fixed": "secondary90",
  "secondary-fixed-dim": "secondary80", surface: "neutral98", "surface-bright": "neutral98", "surface-container": "neutral94",
  "surface-container-high": "neutral92", "surface-container-highest": "neutral90", "surface-container-low": "neutral96",
  "surface-container-lowest": "neutral100", "surface-dim": "neutral87", "surface-tint": "primary40",
  "surface-variant": "neutral-variant90", tertiary: "tertiary40", "tertiary-container": "tertiary90",
  "tertiary-fixed": "tertiary90", "tertiary-fixed-dim": "tertiary80",
};

// A dark role is an alias, to a palette tone or to another role; follow it to its hex.
const dark = (role: string): string => {
  const [, group, name] = DARK[role].$value.match(/^\{md\.(ref\.palette|sys\.color)\.(.+)\}$/)!;
  return group === "sys.color" ? dark(name) : PALETTE[name].$value;
};

/** Every Material colour role's hex in the baseline scheme, by role name, such as `surface-container-low`. */
export const colors = (scheme: "light" | "dark"): Record<string, string> =>
  Object.fromEntries(Object.keys(DARK).map((role) => [role, scheme === "dark" ? dark(role) : PALETTE[LIGHT[role]].$value]));
