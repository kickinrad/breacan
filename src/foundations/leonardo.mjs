// The Leonardo colour engine (Adobe, Apache-2.0), the default: each seed becomes an accent family whose every role
// is generated at a target contrast against the base's surface in that scheme. Greys stay the base's.
// Options: seeds (one to three hex colours: primary, then secondary, then tertiary).
import { BackgroundColor, Color, Theme } from "@adobe/leonardo-contrast-colors";
import { colours } from "../base.mjs";
import { seedsOf } from "./seeds.mjs";

const ROLES = ["primary", "secondary", "tertiary"];
// The target ratio of each role against the scheme's surface. An accent at 5.5 reads as text and takes white (light)
// or the surface (dark) on top at 4.5 or more; a container sits just off the surface and its text far from it.
export const TARGETS = { light: { role: 5.5, container: 1.25, "on-container": 10 }, dark: { role: 7, container: 1.35, "on-container": 11 } };

// shortcut: Leonardo 1.1 warns about its own internal `colorspace` argument on every call; this hides that one
// message while it runs. Drop it when a Leonardo release stops passing the deprecated name to itself.
const quietly = (run) => {
  const warn = console.warn;
  console.warn = (...args) => { if (!String(args[0]).includes("`colorspace` is deprecated")) warn(...args); };
  try { return run(); } finally { console.warn = warn; }
};

// One scheme's accent roles: { role: hex }.
const scheme = (name, seeds) => {
  const surface = colours(name).md.sys.color.surface.$value;
  return quietly(() => {
    const background = new BackgroundColor({ name: "surface", colorKeys: [surface], ratios: [1], colorSpace: "CAM02" });
    const families = seeds.map((seed, i) => new Color({ name: ROLES[i], colorKeys: [seed], ratios: TARGETS[name], colorSpace: "CAM02" }));
    const theme = new Theme({ colors: [background, ...families], backgroundColor: background, lightness: name === "dark" ? 7 : 99 });
    const values = Object.fromEntries(theme.contrastColors.slice(1).map((family) => [family.name, Object.fromEntries(family.values.map((each) => [each.name, each.value]))]));
    const roles = {};
    for (const role of ROLES.slice(0, seeds.length)) {
      const family = values[role];
      roles[role] = family.role;
      roles[`on-${role}`] = name === "dark" ? surface : "#ffffff";
      roles[`${role}-container`] = family.container;
      roles[`on-${role}-container`] = family["on-container"];
    }
    roles["surface-tint"] = roles.primary;
    return roles;
  });
};

export default {
  slot: "foundation",
  name: "leonardo",
  reads: [],
  writes: {},
  // { light, dark }: each scheme's colour roles as a token tree.
  async run({ options }) {
    const seeds = seedsOf(options, "leonardo");
    const light = scheme("light", seeds);
    const dark = scheme("dark", seeds);
    // The inverse primary is the other scheme's primary.
    [light["inverse-primary"], dark["inverse-primary"]] = [dark.primary, light.primary];
    const tree = (roles) => ({ md: { sys: { color: Object.fromEntries(Object.entries(roles).map(([role, hex]) => [role, { $type: "color", $value: hex }])) } } });
    return { light: tree(light), dark: tree(dark) };
  },
};
