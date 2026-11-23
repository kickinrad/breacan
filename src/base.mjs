// The Breacán-neutral base: a value for every role in the contract, so a kit that sets nothing still builds whole.
// Material's role model is the spine (builtin:material sits beneath). Greys and the accent scales are Radix Colors
// (MIT); the type and spacing scales follow Spectrum; motion durations, easings and elevation tiers follow Fluent 2.
// A kit's theme, and later its platform's language, override any of it.
import { blue, blueDark, gray, grayDark, red, redDark, slate, slateDark, violet, violetDark } from "@radix-ui/colors";
import { SPACING, TYPE_ROLES } from "./contract.mjs";

const colour = (hex) => ({ $type: "color", $value: hex });
const px = (value) => ({ $type: "dimension", $value: { value, unit: "px" } });
const ms = (value) => ({ $type: "duration", $value: { value, unit: "ms" } });
const step = (scale, name, n) => scale[`${name}${n}`];

// The accents by Material role, each a Radix scale in light and dark.
const ACCENTS = { primary: ["blue", blue, blueDark], secondary: ["slate", slate, slateDark], tertiary: ["violet", violet, violetDark], error: ["red", red, redDark] };
const WHITE = "#ffffff";
const BLACK = "#000000";

// One scheme's colour roles. Step 11 is Radix's accessible text step, so an accent reads as text and under white
// (light) or its own step 1 (dark); containers take step 4 and their text step 12. Fixed roles are the light values.
export const colours = (scheme) => {
  const dark = scheme === "dark";
  const g = (n) => step(dark ? grayDark : gray, "gray", n);
  const roles = {};
  for (const [role, [name, light, night]] of Object.entries(ACCENTS)) {
    const s = (n) => step(dark ? night : light, name, n);
    const fixed = (n) => step(light, name, n);
    Object.assign(roles, {
      [role]: s(11), [`on-${role}`]: dark ? s(1) : WHITE,
      [`${role}-container`]: s(4), [`on-${role}-container`]: s(12),
    });
    if (role !== "error") {
      Object.assign(roles, {
        [`${role}-fixed`]: fixed(4), [`${role}-fixed-dim`]: fixed(6), [`on-${role}-fixed`]: fixed(12), [`on-${role}-fixed-variant`]: fixed(11),
      });
    }
  }
  Object.assign(roles, {
    surface: g(1), "surface-dim": dark ? g(1) : g(3), "surface-bright": dark ? g(4) : g(1),
    "surface-container-lowest": dark ? g(1) : WHITE, "surface-container-low": g(2), "surface-container": g(3),
    "surface-container-high": g(4), "surface-container-highest": g(5), "surface-variant": g(5),
    background: g(1), "on-background": g(12), "on-surface": g(12), "on-surface-variant": g(11),
    outline: g(9), "outline-variant": g(6),
    "inverse-surface": dark ? step(gray, "gray", 12) : step(grayDark, "gray", 12),
    "inverse-on-surface": dark ? step(gray, "gray", 1) : step(grayDark, "gray", 1),
    "inverse-primary": dark ? step(blue, "blue", 11) : step(blueDark, "blue", 11),
    "surface-tint": dark ? step(blueDark, "blue", 11) : step(blue, "blue", 11),
    scrim: BLACK,
  });
  return { md: { sys: { color: Object.fromEntries(Object.entries(roles).map(([role, hex]) => [role, colour(hex)])) } } };
};

// Spectrum's font sizes (desktop) for each Material type role, and its line heights: 1.3 for headings and labels,
// 1.5 for body text. Headings are bold as Spectrum's are; labels medium.
const SIZES = {
  "display-large": 60, "display-medium": 45, "display-small": 36, "headline-large": 32, "headline-medium": 28, "headline-small": 25,
  "title-large": 22, "title-medium": 16, "title-small": 14, "body-large": 16, "body-medium": 14, "body-small": 12,
  "label-large": 14, "label-medium": 12, "label-small": 11,
};
const WEIGHT = { display: "bold", headline: "bold", title: "bold", body: "regular", label: "medium" };
const SYSTEM_FONT = ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"];

// Everything but colour, the same in every mode.
export const shared = () => {
  const typescale = {};
  for (const role of TYPE_ROLES) {
    const group = role.split("-")[0];
    const size = SIZES[role];
    const entry = {
      size: px(size), "line-height": px(Math.round(size * (group === "body" ? 1.5 : 1.3))), tracking: px(0),
      weight: { $value: `{md.ref.typeface.weight-${WEIGHT[group]}}` },
    };
    typescale[role] = entry;
    typescale[`${role}-emphasized`] = { size: entry.size, "line-height": entry["line-height"], tracking: entry.tracking };
  }
  return {
    md: {
      ref: { typeface: { brand: { $type: "fontFamily", $value: SYSTEM_FONT }, plain: { $type: "fontFamily", $value: SYSTEM_FONT } } },
      sys: {
        typescale,
        // Fluent 2's duration ramp in Material's first eight slots; Material's own longer ones stay.
        motion: {
          duration: Object.fromEntries([50, 100, 150, 200, 250, 300, 400, 500].map((value, i) => [`${["short", "medium"][Math.floor(i / 4)]}${(i % 4) + 1}`, ms(value)])),
          easing: {
            standard: { $type: "cubicBezier", $value: [0.33, 0, 0.67, 1] },
            "standard-decelerate": { $type: "cubicBezier", $value: [0.1, 0.9, 0.2, 1] },
            "standard-accelerate": { $type: "cubicBezier", $value: [0.7, 0, 1, 0.5] },
            "emphasized-decelerate": { $type: "cubicBezier", $value: [0, 0, 0, 1] },
            "emphasized-accelerate": { $type: "cubicBezier", $value: [1, 0, 1, 1] },
          },
        },
        // Fluent 2's shadow tiers: 2, 4, 8, 16 and 28.
        elevation: Object.fromEntries([0, 2, 4, 8, 16, 28].map((value, level) => [`level${level}`, px(value)])),
      },
    },
    breacan: {
      sys: {
        spacing: Object.fromEntries(Object.entries(SPACING).map(([name, value]) => [name, px(value)])),
        // Material's 48dp; a platform's language sets its own (Apple's 44pt).
        "touch-min": px(48),
        "icon-set": { $type: "string", $value: "Material Symbols Outlined" },
        // Material's density scale: 0 is the default, each step down 4px tighter.
        density: { $type: "number", $value: 0 },
      },
    },
  };
};
