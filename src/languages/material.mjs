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
import { colors, vendored } from "../../packages/material/src/colors.ts";

const { typescale, shape, motion, elevation } = vendored.md.sys;

const colour = (hex) => ({ $type: "color", $value: hex });
const bare = (node) => JSON.parse(JSON.stringify(node, (key, value) => key === "$extensions" ? undefined : value));
const roboto = { $type: "fontFamily", $value: ["Roboto", "sans-serif"] };

export default {
  slot: "language",
  name: "material",
  run: ({ scheme } = {}) => ({
    colour: { md: { sys: { color: Object.fromEntries(Object.entries(colors(scheme === "dark" ? "dark" : "light")).map(([role, hex]) => [role, colour(hex)])) } } },
    // The type scale is the vendored one, which names the plain and brand faces; Android's default face is Roboto.
    type: { md: { ref: { typeface: { brand: roboto, plain: roboto } }, sys: { typescale: bare(typescale) } } },
    shape: { md: { sys: { shape: bare(shape) } } },
    spacing: { breacan: { sys: { "touch-min": { $type: "dimension", $value: { value: 48, unit: "px" } } } } },
    motion: { md: { sys: { motion: bare(motion) } } },
    elevation: { md: { sys: { elevation: bare(elevation) } } },
    icons: { breacan: { sys: { "icon-set": { $type: "string", $value: "Material Symbols Outlined" } } } },
  }),
};
