// The role contract: the one list of named roles every output may read, whatever kit or platform built it. It starts
// from Material's system roles (the vendored md.sys tokens, so it follows Material) and adds, under breacan.sys, what
// Apple and Fluent need beside them: a spacing scale, the smallest touch target, the icon set and the density.
import vendored from "../material/material.tokens.json" with { type: "json" };

const leaves = (node, path) => Object.entries(node).filter(([key]) => !key.startsWith("$"))
  .flatMap(([key, child]) => "$value" in child ? [[...path, key].join(".")] : leaves(child, [...path, key]));

// The type roles: Material's fifteen, each with its five properties.
export const TYPE_ROLES = ["display", "headline", "title", "body", "label"].flatMap((group) => ["large", "medium", "small"].map((size) => `${group}-${size}`));
const TYPE_PROPERTIES = ["font", "size", "line-height", "weight", "tracking"];
export const CORNERS = ["none", "extra-small", "small", "medium", "large", "extra-large", "full"];
// Spectrum's spacing steps (spectrum.adobe.com, Design tokens: spacing).
export const SPACING = { 50: 2, 75: 4, 100: 8, 200: 12, 300: 16, 400: 24, 500: 32, 600: 40, 700: 48, 800: 64, 900: 80, 1000: 96 };

const sys = vendored.md.sys;
export const contract = () => [
  ...leaves(sys.color, ["md", "sys", "color"]),
  ...TYPE_ROLES.flatMap((role) => TYPE_PROPERTIES.map((property) => `md.sys.typescale.${role}.${property}`)),
  ...CORNERS.map((corner) => `md.sys.shape.corner.${corner}`),
  ...leaves(sys.motion.duration, ["md", "sys", "motion", "duration"]),
  ...leaves(sys.motion.easing, ["md", "sys", "motion", "easing"]),
  ...leaves(sys.elevation, ["md", "sys", "elevation"]),
  ...leaves(sys.state, ["md", "sys", "state"]),
  ...Object.keys(SPACING).map((step) => `breacan.sys.spacing.${step}`),
  "breacan.sys.touch-min",
  "breacan.sys.icon-set",
  "breacan.sys.density",
];

// The contract's usage rules, by token path: `on` lists the backgrounds a text or icon colour may sit on, and
// `properties` the CSS properties a token may set. A kit adds its own in a token's $extensions["com.kickinrad.breacan"]
// usage, which wins.
export const usage = () => {
  const color = (role) => `md.sys.color.${role}`;
  const surfaces = ["surface", "surface-dim", "surface-bright", "surface-container-lowest", "surface-container-low", "surface-container",
    "surface-container-high", "surface-container-highest", "surface-variant", "background"].map(color);
  const rules = {};
  for (const accent of ["primary", "secondary", "tertiary", "error"]) {
    rules[color(`on-${accent}`)] = { on: [color(accent)] };
    rules[color(`on-${accent}-container`)] = { on: [color(`${accent}-container`)] };
  }
  for (const accent of ["primary", "secondary", "tertiary"]) {
    rules[color(`on-${accent}-fixed`)] = { on: [color(`${accent}-fixed`), color(`${accent}-fixed-dim`)] };
    rules[color(`on-${accent}-fixed-variant`)] = { on: [color(`${accent}-fixed`), color(`${accent}-fixed-dim`)] };
  }
  for (const text of ["on-surface", "on-surface-variant", "on-background"]) rules[color(text)] = { on: surfaces };
  rules[color("inverse-on-surface")] = { on: [color("inverse-surface")] };
  // A decorative line under 3:1: borders and dividers only, never text.
  rules[color("outline-variant")] = { properties: ["border*", "outline*", "column-rule*", "text-decoration-color"] };
  rules[color("scrim")] = { properties: ["background*", "box-shadow"] };
  return rules;
};

// The base check: every contract role has a value in every mode given ({ mode: tokens }).
export const checkContract = (modes) => {
  const roles = contract();
  const missing = Object.entries(modes).flatMap(([mode, tokens]) => {
    const paths = new Set(tokens.map((token) => token.path));
    return roles.filter((role) => !paths.has(role)).map((role) => `${role} (${mode})`);
  });
  if (missing.length) throw new Error(`Base check: ${missing.length} contract role${missing.length === 1 ? " has" : "s have"} no value: ${missing.slice(0, 10).join(", ")}${missing.length > 10 ? ", …" : ""}`);
};
