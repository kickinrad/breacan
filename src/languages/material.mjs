// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// Android foundations for the dial: Material 3's baseline, from the vendored androidx tokens (material/, Apache-2.0).
// Only what Material publishes as fixed values is here: baseline colour roles (light and dark), Roboto and the type
// scale, the shape corner scale, motion durations and easings, elevation levels, the 48 dp touch target and Material
// Symbols. The vendored tokens hold no system chrome, so this language sets none.
//
// Colour roles: https://m3.material.io/styles/color/roles (the baseline scheme, read from androidx's
// ColorDarkTokens.kt and ColorLightTokens.kt)
// Roboto and the type scale: https://m3.material.io/styles/typography/type-scale-tokens
// Shape corner scale: https://m3.material.io/styles/shape/corner-radius-scale
// Motion durations and easings: https://m3.material.io/styles/motion/easing-and-duration/tokens-specs
// Elevation levels: https://m3.material.io/styles/elevation/overview
// 48 dp touch target: https://m3.material.io/foundations/designing/structure#touch-targets
// Icons: https://m3.material.io/styles/icons/overview
import vendored from "../../material/material.tokens.json" with { type: "json" };

const { color: DARK, typescale, shape, motion, elevation } = vendored.md.sys;
const { palette } = vendored.md.ref;

// ColorLightTokens.kt names each role's tone in the same palette; the vendored dark roles are ColorDarkTokens.kt's.
const LIGHT = {
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
const dark = (role) => {
  const value = DARK[role].$value;
  const [, group, name] = value.match(/^\{md\.(ref\.palette|sys\.color)\.(.+)\}$/);
  return group === "sys.color" ? dark(name) : palette[name].$value;
};
const colour = (hex) => ({ $type: "color", $value: hex });
const bare = (node) => JSON.parse(JSON.stringify(node, (key, value) => key === "$extensions" ? undefined : value));
const roboto = { $type: "fontFamily", $value: ["Roboto", "sans-serif"] };

export default {
  slot: "language",
  name: "material",
  run: ({ scheme } = {}) => ({
    colour: { md: { sys: { color: Object.fromEntries(Object.keys(DARK).map((role) =>
      [role, colour(scheme === "dark" ? dark(role) : palette[LIGHT[role]].$value)])) } } },
    // The type scale is the vendored one, which names the plain and brand faces; Android's default face is Roboto.
    type: { md: { ref: { typeface: { brand: roboto, plain: roboto } }, sys: { typescale: bare(typescale) } } },
    shape: { md: { sys: { shape: bare(shape) } } },
    spacing: { breacan: { sys: { "touch-min": { $type: "dimension", $value: { value: 48, unit: "px" } } } } },
    motion: { md: { sys: { motion: bare(motion) } } },
    elevation: { md: { sys: { elevation: bare(elevation) } } },
    icons: { breacan: { sys: { "icon-set": { $type: "string", $value: "Material Symbols Outlined" } } } },
  }),
};
